import { prisma } from "@/lib/prisma";
import { SmsDirection } from "@/lib/enums";

export type SmsMode = "live" | "simulation";

export function getSmsMode(): SmsMode {
  return (process.env.SMS_MODE as SmsMode) || "simulation";
}

export interface SendSmsOptions {
  to: string;           // E.164 phone number
  body: string;
  assignmentId?: string;
  volunteerId?: string;
  sentById?: string;
}

export interface SendSmsResult {
  success: boolean;
  twilioSid?: string;
  simulated: boolean;
  errorMessage?: string;
  logId: string;
}

/**
 * Send an SMS — routes to Twilio or simulation based on SMS_MODE env var.
 */
export async function sendSms(opts: SendSmsOptions): Promise<SendSmsResult> {
  const mode = getSmsMode();
  const fromPhone = process.env.TWILIO_PHONE_NUMBER || "+15550000000";

  if (mode === "live") {
    return sendViaTwilio(opts, fromPhone);
  } else {
    return sendViaSimulation(opts, fromPhone);
  }
}

async function sendViaTwilio(opts: SendSmsOptions, fromPhone: string): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(accountSid, authToken);

    const message = await client.messages.create({
      body: opts.body,
      from: fromPhone,
      to: opts.to,
    });

    const log = await prisma.smsLog.create({
      data: {
        toPhone: opts.to,
        fromPhone,
        body: opts.body,
        direction: SmsDirection.OUTBOUND,
        status: message.status,
        twilioSid: message.sid,
        simulated: false,
        assignmentId: opts.assignmentId,
        volunteerId: opts.volunteerId,
        sentById: opts.sentById,
      },
    });

    if (opts.assignmentId) {
      await prisma.assignment.update({
        where: { id: opts.assignmentId },
        data: { smsSentAt: new Date() },
      });
    }

    return { success: true, twilioSid: message.sid, simulated: false, logId: log.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown Twilio error";

    const log = await prisma.smsLog.create({
      data: {
        toPhone: opts.to,
        fromPhone,
        body: opts.body,
        direction: SmsDirection.OUTBOUND,
        status: "failed",
        simulated: false,
        errorMessage,
        assignmentId: opts.assignmentId,
        volunteerId: opts.volunteerId,
        sentById: opts.sentById,
      },
    });

    return { success: false, simulated: false, errorMessage, logId: log.id };
  }
}

async function sendViaSimulation(opts: SendSmsOptions, fromPhone: string): Promise<SendSmsResult> {
  const log = await prisma.smsLog.create({
    data: {
      toPhone: opts.to,
      fromPhone,
      body: opts.body,
      direction: SmsDirection.OUTBOUND,
      status: "simulated",
      simulated: true,
      assignmentId: opts.assignmentId,
      volunteerId: opts.volunteerId,
      sentById: opts.sentById,
    },
  });

  if (opts.assignmentId) {
    await prisma.assignment.update({
      where: { id: opts.assignmentId },
      data: { smsSentAt: new Date() },
    });
  }

  return { success: true, simulated: true, logId: log.id };
}

/**
 * Build the assignment notification message.
 * Supports {{volunteer_name}}, {{task_name}}, {{task_date}}, {{org_name}} tokens.
 */
export function buildAssignmentMessage(params: {
  volunteerName: string;
  taskName: string;
  taskDate: string;
  orgName: string;
  customMessage?: string | null;
}): string {
  const template =
    params.customMessage ||
    "Hi {{volunteer_name}}, you are assigned to {{task_name}} on {{task_date}} for {{org_name}}. Reply 1 to confirm or 2 to decline. Reply STOP to opt out.";

  return template
    .replace(/{{volunteer_name}}/g, params.volunteerName)
    .replace(/{{task_name}}/g, params.taskName)
    .replace(/{{task_date}}/g, params.taskDate)
    .replace(/{{org_name}}/g, params.orgName);
}

/**
 * Handle inbound SMS reply (called from Twilio webhook).
 * Returns TwiML response string.
 */
export async function handleInboundSms(from: string, body: string): Promise<string> {
  const normalizedBody = body.trim().toLowerCase();

  // Log inbound message
  await prisma.smsLog.create({
    data: {
      toPhone: process.env.TWILIO_PHONE_NUMBER || "+15550000000",
      fromPhone: from,
      body,
      direction: SmsDirection.INBOUND,
      status: "received",
      simulated: false,
    },
  });

  // Handle STOP keyword (opt-out)
  if (["stop", "stopall", "unsubscribe", "cancel", "end", "quit"].includes(normalizedBody)) {
    await prisma.volunteer.updateMany({
      where: { phone: from },
      data: { optedOut: true },
    });
    // Twilio handles STOP compliance automatically; return empty TwiML
    return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  }

  // Handle START keyword (opt back in)
  if (["start", "yes", "unstop"].includes(normalizedBody)) {
    await prisma.volunteer.updateMany({
      where: { phone: from },
      data: { optedOut: false },
    });
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>You have been re-subscribed to messages. Reply STOP at any time to opt out.</Message></Response>`;
  }

  // Find the most recent pending assignment for this volunteer's phone
  const volunteer = await prisma.volunteer.findFirst({
    where: { phone: from, isActive: true },
  });

  if (!volunteer) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  }

  const pendingAssignment = await prisma.assignment.findFirst({
    where: {
      volunteerId: volunteer.id,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
    include: { task: true },
  });

  if (!pendingAssignment) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thank you for your message. We don't have any pending assignments for you at this time.</Message></Response>`;
  }

  if (normalizedBody === "1") {
    await prisma.assignment.update({
      where: { id: pendingAssignment.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thank you! Your assignment to ${pendingAssignment.task.name} has been confirmed. We look forward to seeing you!</Message></Response>`;
  }

  if (normalizedBody === "2") {
    await prisma.assignment.update({
      where: { id: pendingAssignment.id },
      data: { status: "DECLINED", declinedAt: new Date() },
    });
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Understood. Your assignment to ${pendingAssignment.task.name} has been declined. Thank you for letting us know.</Message></Response>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Reply 1 to confirm or 2 to decline your assignment to ${pendingAssignment.task.name}.</Message></Response>`;
}
