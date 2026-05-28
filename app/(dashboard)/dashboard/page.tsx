// @ts-nocheck
// @ts-nocheck
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ClipboardList, CheckSquare, MessageSquare, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import { getSmsMode } from "@/lib/sms";

export default async function DashboardPage() {
  const session = await requireAuth();
  const orgId = session.user.organizationId;

  const [
    totalVolunteers,
    activeVolunteers,
    totalTasks,
    upcomingTasks,
    pendingAssignments,
    confirmedAssignments,
    recentSmsLogs,
    recentTasks,
  ] = await Promise.all([
    prisma.volunteer.count({ where: { organizationId: orgId } }),
    prisma.volunteer.count({ where: { organizationId: orgId, isActive: true, optedOut: false } }),
    prisma.task.count({ where: { organizationId: orgId } }),
    prisma.task.count({
      where: { organizationId: orgId, status: "SCHEDULED", scheduledAt: { gte: new Date() } },
    }),
    prisma.assignment.count({
      where: { task: { organizationId: orgId }, status: "PENDING" },
    }),
    prisma.assignment.count({
      where: { task: { organizationId: orgId }, status: "CONFIRMED" },
    }),
    prisma.smsLog.findMany({
      where: { OR: [{ volunteer: { organizationId: orgId } }, { sentBy: { organizationId: orgId } }] },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { volunteer: { select: { firstName: true, lastName: true } } },
    }),
    prisma.task.findMany({
      where: { organizationId: orgId, scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: {
        category: true,
        _count: { select: { assignments: true } },
      },
    }),
  ]);

  const smsMode = getSmsMode();

  const stats = [
    { label: "Total Volunteers", value: totalVolunteers, sub: `${activeVolunteers} active`, icon: Users, color: "text-indigo-600 bg-indigo-50" },
    { label: "Upcoming Tasks", value: upcomingTasks, sub: `${totalTasks} total`, icon: ClipboardList, color: "text-blue-600 bg-blue-50" },
    { label: "Pending Confirmations", value: pendingAssignments, sub: "awaiting reply", icon: AlertCircle, color: "text-yellow-600 bg-yellow-50" },
    { label: "Confirmed Assignments", value: confirmedAssignments, sub: "all time", icon: CheckSquare, color: "text-green-600 bg-green-50" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, {session.user.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-400" />
          <Badge variant={smsMode === "live" ? "success" : "warning"}>
            SMS: {smsMode === "live" ? "Live" : "Simulation"}
          </Badge>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-2 ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                    <p className="text-xs text-gray-400">{stat.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Upcoming Tasks</CardTitle>
            <Link href="/tasks" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming tasks.</p>
            ) : (
              <ul className="space-y-3">
                {recentTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: task.category.color }}
                      />
                      <div>
                        <Link href={`/tasks/${task.id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                          {task.name}
                        </Link>
                        <p className="text-xs text-gray-500">{formatDateTime(task.scheduledAt)}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">{task._count.assignments} assigned</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent SMS Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Recent SMS Activity</CardTitle>
            <Link href="/sms-log" className="text-sm text-indigo-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentSmsLogs.length === 0 ? (
              <p className="text-sm text-gray-500">No SMS activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentSmsLogs.map((log) => (
                  <li key={log.id} className="flex items-start gap-3">
                    <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${log.direction === "OUTBOUND" ? "bg-blue-400" : "bg-green-400"}`} />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-700">{log.body}</p>
                      <p className="text-xs text-gray-400">
                        {log.direction === "OUTBOUND" ? "→" : "←"}{" "}
                        {log.volunteer ? `${log.volunteer.firstName} ${log.volunteer.lastName}` : log.toPhone}
                        {" · "}
                        {log.simulated && <span className="text-yellow-600">simulated · </span>}
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href="/volunteers/new" className="rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100">
              + Add Volunteer
            </Link>
            <Link href="/tasks/new" className="rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
              + Create Task
            </Link>
            <Link href="/teams" className="rounded-md bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100">
              Manage Teams
            </Link>
            <Link href="/sms-log" className="rounded-md bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
              SMS Inbox
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
