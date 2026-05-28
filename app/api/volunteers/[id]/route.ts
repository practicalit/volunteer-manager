import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { volunteerSchema } from "@/lib/validations";
import { normalizePhone } from "@/lib/utils";

async function getVolunteerOr404(id: string, orgId: string) {
  const v = await prisma.volunteer.findFirst({ where: { id, organizationId: orgId } });
  return v;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const volunteer = await prisma.volunteer.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      teamMemberships: {
        include: { team: { include: { category: true, leader: { select: { id: true, name: true } } } } },
      },
      assignments: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { task: { include: { category: true } } },
      },
    },
  });

  if (!volunteer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(volunteer);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const v = await getVolunteerOr404(id, session.user.organizationId);
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = volunteerSchema.partial().parse(body);

    const updated = await prisma.volunteer.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.phone && { phone: normalizePhone(data.phone) }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.skills !== undefined && { skills: data.skills }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.optedOut !== undefined && { optedOut: body.optedOut }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const v = await getVolunteerOr404(id, session.user.organizationId);
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.volunteer.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
