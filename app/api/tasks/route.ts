import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validations";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const categoryId = searchParams.get("categoryId");
  const teamId = searchParams.get("teamId");

  const tasks = await prisma.task.findMany({
    where: {
      organizationId: session.user.organizationId,
      ...(status && { status: status as "DRAFT" | "SCHEDULED" | "COMPLETED" | "CANCELLED" }),
      ...(categoryId && { categoryId }),
      ...(teamId && { teamId }),
    },
    orderBy: { scheduledAt: "asc" },
    include: {
      category: true,
      team: { include: { leader: { select: { id: true, name: true } } } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { assignments: true } },
    },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = taskSchema.parse(body);

    const task = await prisma.task.create({
      data: {
        name: data.name,
        description: data.description || null,
        categoryId: data.categoryId,
        teamId: data.teamId || null,
        templateId: data.templateId || null,
        organizationId: session.user.organizationId,
        createdById: session.user.id,
        scheduledAt: new Date(data.scheduledAt),
        isRecurring: data.isRecurring || false,
        recurrenceRule: data.recurrenceRule || null,
        customMessage: data.customMessage || null,
      },
      include: { category: true, team: true },
    });

    // Auto-assign team members if a team was selected
    if (data.teamId) {
      const memberships = await prisma.teamMembership.findMany({
        where: { teamId: data.teamId },
        include: { volunteer: { select: { isActive: true, optedOut: true } } },
      });
      const eligibleIds: string[] = memberships
        .filter((m: { volunteerId: string; volunteer: { isActive: boolean; optedOut: boolean } }) => m.volunteer.isActive && !m.volunteer.optedOut)
        .map((m: { volunteerId: string; volunteer: { isActive: boolean; optedOut: boolean } }) => m.volunteerId);

      if (eligibleIds.length > 0) {
        await prisma.assignment.createMany({
          data: eligibleIds.map((volunteerId: string) => ({
            taskId: task.id,
            volunteerId,
            status: "PENDING",
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
