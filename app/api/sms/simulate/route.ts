import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleInboundSms } from "@/lib/sms";
import { SmsDirection } from "@/lib/enums";

// POST /api/sms/simulate — simulate a volunteer reply in simulation mode
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if ((process.env.SMS_MODE ?? "simulation") !== "simulation") {
    return NextResponse.json({ error: "Simulation only available when SMS_MODE=simulation" }, { status: 400 });
  }

  const { assignmentId, reply } = await req.json() as { assignmentId: string; reply: string };

  if (!assignmentId || !reply) {
    return NextResponse.json({ error: "assignmentId and reply required" }, { status: 400 });
  }

  const assignment = await prisma.assignment.findFirst({
    where: { id: assignmentId, task: { organizationId: session.user.organizationId } },
    include: { volunteer: true },
  });

  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  const volunteer = assignment.volunteer;

  // Log the simulated inbound
  await prisma.smsLog.create({
    data: {
      toPhone: process.env.TWILIO_PHONE_NUMBER || "+15550000000",
      fromPhone: volunteer.phone,
      body: reply,
      direction: SmsDirection.INBOUND,
      status: "simulated",
      simulated: true,
      assignmentId,
      volunteerId: volunteer.id,
    },
  });

  // Process as if it were a real inbound message
  await handleInboundSms(volunteer.phone, reply);

  const updatedAssignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
  return NextResponse.json({ success: true, assignment: updatedAssignment });
}

// GET /api/sms/simulate — list simulated messages (simulation inbox)
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const [logs, total] = await Promise.all([
    prisma.smsLog.findMany({
      where: {
        simulated: true,
        OR: [
          { volunteer: { organizationId: session.user.organizationId } },
          { sentBy: { organizationId: session.user.organizationId } },
        ],
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        volunteer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        assignment: { include: { task: { select: { name: true, scheduledAt: true } } } },
      },
    }),
    prisma.smsLog.count({
      where: {
        simulated: true,
        OR: [
          { volunteer: { organizationId: session.user.organizationId } },
          { sentBy: { organizationId: session.user.organizationId } },
        ],
      },
    }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
}
