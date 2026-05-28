import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teamSchema } from "@/lib/validations";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const team = await prisma.team.findFirst({
    where: { id, category: { organizationId: session.user.organizationId } },
    include: {
      category: true,
      leader: { select: { id: true, name: true, email: true } },
      memberships: {
        include: { volunteer: true },
        orderBy: { volunteer: { lastName: "asc" } },
      },
      tasks: {
        orderBy: { scheduledAt: "desc" },
        take: 10,
        include: { category: true, _count: { select: { assignments: true } } },
      },
    },
  });

  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(team);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const team = await prisma.team.findFirst({
    where: { id, category: { organizationId: session.user.organizationId } },
  });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Handle member add/remove
  if (body.addVolunteerId) {
    await prisma.teamMembership.upsert({
      where: { teamId_volunteerId: { teamId: id, volunteerId: body.addVolunteerId } },
      create: { teamId: id, volunteerId: body.addVolunteerId },
      update: {},
    });
    return NextResponse.json({ success: true });
  }

  if (body.removeVolunteerId) {
    await prisma.teamMembership.deleteMany({
      where: { teamId: id, volunteerId: body.removeVolunteerId },
    });
    return NextResponse.json({ success: true });
  }

  const data = teamSchema.partial().parse(body);
  const updated = await prisma.team.update({
    where: { id },
    data,
    include: { category: true, leader: { select: { id: true, name: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const team = await prisma.team.findFirst({
    where: { id, category: { organizationId: session.user.organizationId } },
  });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.team.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
