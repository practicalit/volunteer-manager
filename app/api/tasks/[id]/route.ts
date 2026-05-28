import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskSchema } from "@/lib/validations";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      category: true,
      team: { include: { leader: { select: { id: true, name: true } } } },
      createdBy: { select: { id: true, name: true } },
      template: true,
      assignments: {
        include: { volunteer: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data = taskSchema.partial().parse(body);

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...data,
      ...(body.status && { status: body.status }),
      ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) }),
    },
    include: { category: true, team: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
