// @ts-nocheck
// @ts-nocheck
import { requireAuth } from "@/lib/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Users } from "lucide-react";
import { TaskStatus } from "@/lib/enums";

const STATUS_LABELS: Record<TaskStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

interface PageProps {
  searchParams: { status?: string; categoryId?: string; teamId?: string };
}

export default async function TasksPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  const { status, categoryId, teamId } = searchParams;

  const [tasks, categories, teams] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(status ? { status: status as TaskStatus } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(teamId ? { teamId } : {}),
      },
      include: {
        category: true,
        team: true,
        _count: { select: { assignments: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.category.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.team.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  const buildUrl = (params: Record<string, string | undefined>) => {
    const base: Record<string, string> = {};
    if (status) base.status = status;
    if (categoryId) base.categoryId = categoryId;
    if (teamId) base.teamId = teamId;
    const merged = { ...base, ...params };
    const qs = new URLSearchParams(
      Object.entries(merged).filter(([, v]) => v != null) as [string, string][]
    );
    return `/tasks?${qs.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/tasks/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            {/* Status filter */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs font-medium text-gray-500 mr-1">Status:</span>
              <Link href={buildUrl({ status: undefined })}>
                <Badge variant={!status ? "default" : "outline"} className="cursor-pointer">All</Badge>
              </Link>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <Link key={val} href={buildUrl({ status: val })}>
                  <Badge variant={status === val ? "default" : "outline"} className="cursor-pointer">{label}</Badge>
                </Link>
              ))}
            </div>

            {/* Category filter */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs font-medium text-gray-500 mr-1">Category:</span>
                <Link href={buildUrl({ categoryId: undefined })}>
                  <Badge variant={!categoryId ? "default" : "outline"} className="cursor-pointer">All</Badge>
                </Link>
                {categories.map((c) => (
                  <Link key={c.id} href={buildUrl({ categoryId: c.id })}>
                    <Badge variant={categoryId === c.id ? "default" : "outline"} className="cursor-pointer">{c.name}</Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* Team filter */}
            {teams.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs font-medium text-gray-500 mr-1">Team:</span>
                <Link href={buildUrl({ teamId: undefined })}>
                  <Badge variant={!teamId ? "default" : "outline"} className="cursor-pointer">All</Badge>
                </Link>
                {teams.map((t) => (
                  <Link key={t.id} href={buildUrl({ teamId: t.id })}>
                    <Badge variant={teamId === t.id ? "default" : "outline"} className="cursor-pointer">{t.name}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task list */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No tasks found.</p>
            <Link href="/tasks/new" className="mt-3 inline-block">
              <Button variant="outline" size="sm">Create your first task</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Task</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Scheduled</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Team</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Assigned</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{task.name}</div>
                    {task.category && (
                      <div className="mt-0.5">
                        <Badge variant="outline" className="text-xs" style={{ borderColor: task.category.color ?? undefined, color: task.category.color ?? undefined }}>
                          {task.category.name}
                        </Badge>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(task.scheduledAt)}</td>
                  <td className="px-4 py-3 text-gray-600">{task.team?.name ?? <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {task._count.assignments}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getStatusColor(task.status)}>{STATUS_LABELS[task.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/tasks/${task.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
