// @ts-nocheck
// @ts-nocheck
import { requireAuth } from "@/lib/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AssignmentStatus } from "@/lib/enums";

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  NO_RESPONSE: "No Response",
};

const STATUS_STYLES: Record<AssignmentStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-800",
  NO_RESPONSE: "bg-gray-100 text-gray-600",
};

interface PageProps {
  searchParams: { status?: string; page?: string };
}

const PAGE_SIZE = 25;

export default async function AssignmentsPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  const { status, page: pageParam } = searchParams;
  const page = Math.max(1, Number(pageParam ?? 1));

  const where = {
    task: { organizationId: session.user.organizationId },
    ...(status ? { status: status as AssignmentStatus } : {}),
  };

  const [total, assignments] = await Promise.all([
    prisma.assignment.count({ where }),
    prisma.assignment.findMany({
      where,
      include: {
        volunteer: true,
        task: { include: { team: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildUrl = (params: Record<string, string | undefined>) => {
    const base: Record<string, string> = {};
    if (status) base.status = status;
    if (page > 1) base.page = String(page);
    const merged = { ...base, ...params };
    const qs = new URLSearchParams(
      Object.entries(merged).filter(([, v]) => v != null) as [string, string][]
    );
    return `/assignments?${qs.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
        <p className="text-sm text-gray-500">{total} total</p>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        <Link href={buildUrl({ status: undefined, page: "1" })}>
          <Badge variant={!status ? "default" : "outline"} className="cursor-pointer">All</Badge>
        </Link>
        {Object.entries(STATUS_LABELS).map(([val, label]) => (
          <Link key={val} href={buildUrl({ status: val, page: "1" })}>
            <Badge variant={status === val ? "default" : "outline"} className="cursor-pointer">{label}</Badge>
          </Link>
        ))}
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">No assignments found.</CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Volunteer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Task</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Scheduled</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Team</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/volunteers/${a.volunteerId}`} className="font-medium text-gray-900 hover:text-indigo-600">
                        {a.volunteer.firstName} {a.volunteer.lastName}
                      </Link>
                      <div className="text-xs text-gray-400">{a.volunteer.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/tasks/${a.taskId}`} className="text-indigo-600 hover:underline">
                        {a.task.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(a.task.scheduledAt)}</td>
                    <td className="px-4 py-3 text-gray-600">{a.task.team?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status]}`}>
                        {STATUS_LABELS[a.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={buildUrl({ page: String(page - 1) })}>
                    <Badge variant="outline" className="cursor-pointer">← Previous</Badge>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={buildUrl({ page: String(page + 1) })}>
                    <Badge variant="outline" className="cursor-pointer">Next →</Badge>
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
