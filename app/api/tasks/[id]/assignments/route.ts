import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSms, buildAssignmentMessage } from "@/lib/sms";
import { formatDateTime } from "@/lib/utils";

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
  const { volunteerIds, sendNotification = true } = body as {
    volunteerIds: string[];
    sendNotification?: boolean;
  };

  if (!Array.isArray(volunteerIds) || volunteerIds.length === 0) {
    return NextResponse.json({ error: "volunteerIds required" }, { status: 400 });
  }

  const results = [];

  for (const volunteerId of volunteerIds) {
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
        customMessage: task.customMessage,
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

  return NextResponse.json({ results });
}
