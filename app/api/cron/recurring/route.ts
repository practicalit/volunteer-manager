// @ts-nocheck
// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RRule } from "rrule";

// GET /api/cron/recurring — called by a cron job (e.g., Vercel Cron, pg_cron)
// Generates next occurrence tasks from recurring tasks
export async function GET(req: Request) {
  // Verify cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recurringTasks = await prisma.task.findMany({
    where: {
      isRecurring: true,
      recurrenceRule: { not: null },
      status: { in: ["SCHEDULED", "DRAFT"] },
    },
    include: { assignments: { include: { volunteer: true } } },
  });

  let created = 0;

  for (const task of recurringTasks) {
    if (!task.recurrenceRule) continue;

    try {
      const rule = RRule.fromString(task.recurrenceRule);
      const now = new Date();
      const lookAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // next 14 days

      const occurrences = rule.between(now, lookAhead, true);

      for (const occurrence of occurrences) {
        // Check if a task already exists for this occurrence
        const exists = await prisma.task.findFirst({
          where: {
            templateId: task.templateId,
            organizationId: task.organizationId,
            scheduledAt: occurrence,
            name: task.name,
          },
        });

        if (!exists && occurrence.getTime() > task.scheduledAt.getTime()) {
          const newTask = await prisma.task.create({
            data: {
              name: task.name,
              description: task.description,
              categoryId: task.categoryId,
              teamId: task.teamId,
              organizationId: task.organizationId,
              createdById: task.createdById,
              templateId: task.templateId,
              scheduledAt: occurrence,
              isRecurring: true,
              recurrenceRule: task.recurrenceRule,
              customMessage: task.customMessage,
            },
          });

          // Re-assign same volunteers
          if (task.assignments.length > 0) {
            await prisma.assignment.createMany({
              data: task.assignments.map((a) => ({
                taskId: newTask.id,
                volunteerId: a.volunteerId,
              })),
              skipDuplicates: true,
            });
          }

          created++;
        }
      }
    } catch (err) {
      console.error(`Failed to process recurring task ${task.id}:`, err);
    }
  }

  return NextResponse.json({ processed: recurringTasks.length, created });
}
