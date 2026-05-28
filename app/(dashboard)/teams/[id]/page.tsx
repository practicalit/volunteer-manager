// @ts-nocheck
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, getInitials, getStatusColor } from "@/lib/utils";
import { ArrowLeft, Users, ClipboardList } from "lucide-react";
import { TeamMembersManager } from "./team-members-manager";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;
  const orgId = session.user.organizationId;

  const [team, availableVolunteers] = await Promise.all([
    prisma.team.findFirst({
      where: { id, category: { organizationId: orgId } },
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
          include: {
            category: true,
            _count: { select: { assignments: true } },
          },
        },
      },
    }),
    prisma.volunteer.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  if (!team) notFound();

  const memberIds = team.memberships.map((m) => m.volunteerId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/teams">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: team.category.color }} />
            <Badge variant="outline" style={{ borderColor: team.category.color, color: team.category.color }}>
              {team.category.name}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
          {team.description && <p className="text-sm text-gray-500 mt-1">{team.description}</p>}
          <p className="text-sm text-gray-400 mt-1">Leader: {team.leader.name}</p>
        </div>
        <Link href={`/tasks/new?teamId=${id}`}>
          <Button>
            <ClipboardList className="h-4 w-4" />
            Create Task
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({team.memberships.length})
            </CardTitle>
            <TeamMembersManager teamId={id} availableVolunteers={availableVolunteers} memberIds={memberIds} />
          </CardHeader>
          <CardContent>
            {team.memberships.length === 0 ? (
              <p className="text-sm text-gray-400">No members yet.</p>
            ) : (
              <ul className="space-y-2">
                {team.memberships.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-xs font-medium text-indigo-600">
                        {getInitials(`${m.volunteer.firstName} ${m.volunteer.lastName}`)}
                      </div>
                      <div>
                        <Link href={`/volunteers/${m.volunteer.id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                          {m.volunteer.firstName} {m.volunteer.lastName}
                        </Link>
                        <p className="text-xs text-gray-400">{m.volunteer.phone}</p>
                      </div>
                    </div>
                    <TeamMembersManager teamId={id} volunteerId={m.volunteer.id} mode="remove" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Tasks ({team.tasks.length})
            </CardTitle>
            <Link href={`/tasks?teamId=${id}`} className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {team.tasks.length === 0 ? (
              <p className="text-sm text-gray-400">No tasks yet.</p>
            ) : (
              <ul className="space-y-2">
                {team.tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2">
                    <div>
                      <Link href={`/tasks/${t.id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                        {t.name}
                      </Link>
                      <p className="text-xs text-gray-400">{formatDateTime(t.scheduledAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{t._count.assignments} assigned</Badge>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
