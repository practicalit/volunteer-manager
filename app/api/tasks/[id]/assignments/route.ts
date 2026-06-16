import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSms, buildAssignmentMessage } from "@/lib/sms";
import { formatDateTime } from "@/lib/utils";

const CONFLICT_WINDOW_MS = 2 * 60 * 60 * 1000; // ±2 hours

// POST /api/tasks/[id]/assignments — assign volunteers to task and optionally send SMS
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: taskId } = await params;

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: session.user.organizationId },
    include: { category: true, organization: true },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const body = await req.json();
  const { volunteerIds, forceVolunteerIds = [], sendNotification = true, customMessage: bodyCustomMessage } = body as {
    volunteerIds: string[];
    forceVolunteerIds?: string[];
    sendNotification?: boolean;
    customMessage?: string;
  };

  if (!Array.isArray(volunteerIds) || volunteerIds.length === 0) {
    return NextResponse.json({ error: "volunteerIds required" }, { status: 400 });
  }

  const forceSet = new Set<string>(forceVolunteerIds);

  // Two-step conflict detection:
  // 1. Find all other tasks in the same org within the conflict window.
  // 2. Check if any of the requested volunteers are PENDING/CONFIRMED on those tasks.
  const windowStart = new Date(task.scheduledAt.getTime() - CONFLICT_WINDOW_MS);
  const windowEnd   = new Date(task.scheduledAt.getTime() + CONFLICT_WINDOW_MS);

  const overlappingTasks = await prisma.task.findMany({
    where: {
      organizationId: session.user.organizationId,
      id: { not: taskId },
      scheduledAt: { gte: windowStart, lte: windowEnd },
    },
    select: { id: true, name: true },
  });

  const conflictMap = new Map<string, string>(); // volunteerId → conflicting task name

  if (overlappingTasks.length > 0) {
    const overlappingTaskIds = overlappingTasks.map((t) => t.id);
    const taskNameById = new Map(overlappingTasks.map((t) => [t.id, t.name]));

    const conflictingAssignments = await prisma.assignment.findMany({
      where: {
        volunteerId: { in: volunteerIds },
        taskId: { in: overlappingTaskIds },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: { volunteerId: true, taskId: true },
    });

    for (const ca of conflictingAssignments) {
      if (!conflictMap.has(ca.volunteerId)) {
        conflictMap.set(ca.volunteerId, taskNameById.get(ca.taskId) ?? "another task");
      }
    }
  }

  const results = [];
  const conflicts: { volunteerId: string; taskName: string }[] = [];

  for (const volunteerId of volunteerIds) {
    // Skip volunteers with a scheduling conflict unless the lead explicitly forced it
    if (conflictMap.has(volunteerId) && !forceSet.has(volunteerId)) {
      conflicts.push({ volunteerId, taskName: conflictMap.get(volunteerId)! });
      continue;
    }

    const volunteer = await prisma.volunteer.findFirst({
      where: { id: volunteerId, organizationId: session.user.organizationId },
    });
    if (!volunteer) continue;

    // Create assignment (skip duplicate)
    const assignment = await prisma.assignment.upsert({
      where: { taskId_volunteerId: { taskId, volunteerId } } as never, // handled via create pattern
      create: { taskId, volunteerId },
      update: {},
    }).catch(() =>
      prisma.assignment.findFirst({ where: { taskId, volunteerId } })
    );

    if (!assignment) continue;

    let smsResult = null;
    if (sendNotification && !volunteer.optedOut && volunteer.isActive) {
      const message = buildAssignmentMessage({
        volunteerName: volunteer.firstName,
        taskName: task.name,
        taskDate: formatDateTime(task.scheduledAt),
        orgName: task.organization.name,
        // Per-send override takes precedence; fall back to the task's default.
        customMessage: bodyCustomMessage || task.customMessage,
      });

      smsResult = await sendSms({
        to: volunteer.phone,
        body: message,
        assignmentId: assignment.id,
        volunteerId: volunteer.id,
        sentById: session.user.id,
      });
    }

    results.push({ volunteerId, assignmentId: assignment.id, smsResult });
  }

  return NextResponse.json({ results, conflicts });
}
