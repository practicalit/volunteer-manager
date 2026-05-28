import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSms, buildAssignmentMessage } from "@/lib/sms";
import { formatDateTime } from "@/lib/utils";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const assignment = await prisma.assignment.findFirst({
    where: { id, task: { organizationId: session.user.organizationId } },
    include: { task: { include: { organization: true } }, volunteer: true },
  });
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Replace volunteer (reassignment)
  if (body.newVolunteerId) {
    const newVol = await prisma.volunteer.findFirst({
      where: { id: body.newVolunteerId, organizationId: session.user.organizationId },
    });
    if (!newVol) return NextResponse.json({ error: "Volunteer not found" }, { status: 404 });

    const updated = await prisma.assignment.update({
      where: { id },
      data: { volunteerId: body.newVolunteerId, status: "PENDING", smsSentAt: null, confirmedAt: null, declinedAt: null },
      include: { task: { include: { organization: true } }, volunteer: true },
    });

    // Send notification to new volunteer
    if (!newVol.optedOut && newVol.isActive) {
      const message = buildAssignmentMessage({
        volunteerName: newVol.firstName,
        taskName: updated.task.name,
        taskDate: formatDateTime(updated.task.scheduledAt),
        orgName: updated.task.organization.name,
        customMessage: updated.task.customMessage,
      });
      await sendSms({ to: newVol.phone, body: message, assignmentId: id, volunteerId: newVol.id, sentById: session.user.id });
    }

    return NextResponse.json(updated);
  }

  // Manual status update
  if (body.status) {
    const data: Record<string, unknown> = { status: body.status };
    if (body.status === "CONFIRMED") data.confirmedAt = new Date();
    if (body.status === "DECLINED") data.declinedAt = new Date();

    const updated = await prisma.assignment.update({ where: { id }, data });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "No valid update" }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const assignment = await prisma.assignment.findFirst({
    where: { id, task: { organizationId: session.user.organizationId } },
  });
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.assignment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
