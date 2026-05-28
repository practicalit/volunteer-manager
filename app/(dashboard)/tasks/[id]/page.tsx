// @ts-nocheck
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar, Users, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime, getStatusColor } from "@/lib/utils";
import { AssignVolunteersButton } from "./assign-volunteers-button";
import { AssignmentsTable } from "./assignments-table";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

interface Props { params: Promise<{ id: string }> }

export default async function TaskDetailPage({ params }: Props) {
  const session = await requireAuth();
  const orgId = session.user.organizationId;
  const smsMode = process.env.SMS_MODE ?? "simulation";
  const { id } = await params;

  const [task, allVolunteers] = await Promise.all([
    prisma.task.findFirst({
      where: { id, organizationId: orgId },
      include: {
        category: true,
        team: { include: { memberships: { select: { volunteerId: true } } } },
        assignments: {
          include: { volunteer: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.volunteer.findMany({
      where: { organizationId: orgId, isActive: true, optedOut: false },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  if (!task) notFound();

  const confirmed = task.assignments.filter((a) => a.status === "CONFIRMED").length;
  const pending = task.assignments.filter((a) => a.status === "PENDING").length;
  const declined = task.assignments.filter((a) => a.status === "DECLINED").length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/tasks" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ChevronLeft className="h-4 w-4" /> Back to tasks
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{task.name}</h1>
            {task.description && <p className="mt-1 text-gray-500">{task.description}</p>}
          </div>
          <Badge className={getStatusColor(task.status)}>{STATUS_LABELS[task.status] ?? task.status}</Badge>
        </div>
      </div>

      {/* Metadata cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-gray-500">Scheduled</div>
            <div className="mt-1 font-semibold text-gray-900 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              {formatDate(task.scheduledAt)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-gray-500">Team</div>
            <div className="mt-1 font-semibold text-gray-900">
              {task.team ? (
                <Link href={`/teams/${task.team.id}`} className="text-indigo-600 hover:underline">
                  {task.team.name}
                </Link>
              ) : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-gray-500">Category</div>
            <div className="mt-1 font-semibold text-gray-900">
              {task.category?.name ?? "—"}
            </div>
          </CardContent>
        </Card>
        {task.rrule && (
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Recurring
              </div>
              <div className="mt-1 text-xs text-gray-600 font-mono break-all">{task.rrule}</div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Assignment stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Confirmed", value: confirmed, color: "text-green-700 bg-green-50" },
          { label: "Pending", value: pending, color: "text-yellow-700 bg-yellow-50" },
          { label: "Declined", value: declined, color: "text-red-700 bg-red-50" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className={`pt-4 ${color} rounded-lg`}>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs font-medium">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              Volunteers ({task.assignments.length})
            </CardTitle>
            <AssignVolunteersButton
              taskId={task.id}
              volunteers={allVolunteers}
              existingAssignments={task.assignments.map((a) => ({ id: a.id, volunteerId: a.volunteerId }))}
              teamMemberIds={task.team?.memberships.map((m) => m.volunteerId) ?? []}
              smsMode={smsMode}
            />
          </div>
        </CardHeader>
        <CardContent>
          <AssignmentsTable
            taskId={task.id}
            assignments={task.assignments.map((a) => ({
              id: a.id,
              status: a.status,
              volunteer: {
                id: a.volunteer.id,
                firstName: a.volunteer.firstName,
                lastName: a.volunteer.lastName,
                phone: a.volunteer.phone,
              },
              smsSentAt: a.smsSentAt?.toISOString() ?? null,
              respondedAt: (a.confirmedAt ?? a.declinedAt)?.toISOString() ?? null,
            }))}
            smsMode={smsMode}
          />
        </CardContent>
      </Card>
    </div>
  );
}
