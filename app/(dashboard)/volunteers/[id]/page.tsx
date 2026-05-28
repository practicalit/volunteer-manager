// @ts-nocheck
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPhone, formatDate, formatDateTime, getInitials, getStatusColor } from "@/lib/utils";
import { ArrowLeft, Phone, Mail, ClipboardList } from "lucide-react";
import { VolunteerActions } from "./volunteer-actions";

export default async function VolunteerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const volunteer = await prisma.volunteer.findFirst({
    where: { id, organizationId: session.user.organizationId },
    include: {
      teamMemberships: {
        include: {
          team: {
            include: { category: true, leader: { select: { id: true, name: true } } },
          },
        },
      },
      assignments: {
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { task: { include: { category: true } } },
      },
    },
  });

  if (!volunteer) notFound();

  const allTeams = await prisma.team.findMany({
    where: { category: { organizationId: session.user.organizationId } },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const memberTeamIds = volunteer.teamMemberships.map((m) => m.teamId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/volunteers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-700">
            {getInitials(`${volunteer.firstName} ${volunteer.lastName}`)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {volunteer.firstName} {volunteer.lastName}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {formatPhone(volunteer.phone)}
              </span>
              {volunteer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {volunteer.email}
                </span>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              {!volunteer.isActive ? (
                <Badge variant="destructive">Inactive</Badge>
              ) : volunteer.optedOut ? (
                <Badge variant="warning">Opted Out of SMS</Badge>
              ) : (
                <Badge variant="success">Active</Badge>
              )}
            </div>
          </div>
        </div>
        <VolunteerActions volunteer={volunteer} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Skills & Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {volunteer.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {volunteer.skills.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No skills listed.</p>
            )}
            {volunteer.notes && (
              <div>
                <p className="text-xs font-medium uppercase text-gray-400">Notes</p>
                <p className="mt-1 text-sm text-gray-600">{volunteer.notes}</p>
              </div>
            )}
            <div className="text-xs text-gray-400">
              Added {formatDate(volunteer.createdAt)}
            </div>
          </CardContent>
        </Card>

        {/* Teams */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Team Memberships</CardTitle>
            <VolunteerActions volunteer={volunteer} allTeams={allTeams} memberTeamIds={memberTeamIds} mode="teams" />
          </CardHeader>
          <CardContent>
            {volunteer.teamMemberships.length === 0 ? (
              <p className="text-sm text-gray-400">Not in any teams.</p>
            ) : (
              <div className="space-y-2">
                {volunteer.teamMemberships.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-md border border-gray-100 p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: m.team.category.color }}
                      />
                      <div>
                        <Link href={`/teams/${m.teamId}`} className="font-medium text-gray-900 hover:text-indigo-600">
                          {m.team.name}
                        </Link>
                        <p className="text-xs text-gray-400">
                          {m.team.category.name} · Lead: {m.team.leader.name}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" style={{ borderColor: m.team.category.color, color: m.team.category.color }}>
                      {m.team.category.name}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignment History */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Assignment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {volunteer.assignments.length === 0 ? (
              <p className="text-sm text-gray-400">No assignments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="pb-2 font-medium text-gray-500">Task</th>
                      <th className="pb-2 px-4 font-medium text-gray-500">Category</th>
                      <th className="pb-2 px-4 font-medium text-gray-500">Scheduled</th>
                      <th className="pb-2 font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {volunteer.assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2">
                          <Link href={`/tasks/${a.task.id}`} className="font-medium text-gray-900 hover:text-indigo-600">
                            {a.task.name}
                          </Link>
                        </td>
                        <td className="py-2 px-4">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.task.category.color }} />
                            {a.task.category.name}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-gray-500">{formatDateTime(a.task.scheduledAt)}</td>
                        <td className="py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(a.status)}`}>
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
