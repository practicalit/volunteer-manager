// @ts-nocheck
// @ts-nocheck
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPhone, formatDate, getInitials } from "@/lib/utils";
import { Plus, Search } from "lucide-react";
import { VolunteerSearch } from "./volunteer-search";

export default async function VolunteersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await requireAuth();
  const orgId = session.user.organizationId;
  const sp = await searchParams;
  const search = sp.search || "";
  const page = parseInt(sp.page || "1");
  const limit = 20;

  const where = {
    organizationId: orgId,
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [volunteers, total] = await Promise.all([
    prisma.volunteer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        teamMemberships: { include: { team: { include: { category: true } } } },
        _count: { select: { assignments: true } },
      },
    }),
    prisma.volunteer.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Volunteers</h1>
          <p className="text-sm text-gray-500">{total} total volunteers</p>
        </div>
        <Link href="/volunteers/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Volunteer
          </Button>
        </Link>
      </div>

      <VolunteerSearch defaultValue={search} />

      <Card>
        <CardContent className="p-0">
          {volunteers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-gray-500">No volunteers found.</p>
              <Link href="/volunteers/new" className="mt-2 text-sm text-indigo-600 hover:underline">
                Add your first volunteer
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="py-3 pl-6 text-left font-medium text-gray-600">Name</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600">Phone</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 hidden md:table-cell">Teams</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600 hidden lg:table-cell">Skills</th>
                    <th className="py-3 px-4 text-left font-medium text-gray-600">Status</th>
                    <th className="py-3 pr-6 text-right font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {volunteers.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="py-3 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700">
                            {getInitials(`${v.firstName} ${v.lastName}`)}
                          </div>
                          <div>
                            <Link href={`/volunteers/${v.id}`} className="font-medium text-gray-900 hover:text-indigo-600">
                              {v.lastName}, {v.firstName}
                            </Link>
                            {v.email && <p className="text-xs text-gray-400">{v.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{formatPhone(v.phone)}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {v.teamMemberships.slice(0, 3).map((m) => (
                            <Badge key={m.id} variant="outline" style={{ borderColor: m.team.category.color, color: m.team.category.color }}>
                              {m.team.name}
                            </Badge>
                          ))}
                          {v.teamMemberships.length > 3 && (
                            <Badge variant="secondary">+{v.teamMemberships.length - 3}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {v.skills.slice(0, 3).map((s) => (
                            <Badge key={s} variant="secondary">{s}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {!v.isActive ? (
                          <Badge variant="destructive">Inactive</Badge>
                        ) : v.optedOut ? (
                          <Badge variant="warning">Opted Out</Badge>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </td>
                      <td className="py-3 pr-6 text-right">
                        <Link href={`/volunteers/${v.id}`} className="text-sm text-indigo-600 hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {totalPages} · {total} volunteers</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/volunteers?page=${page - 1}&search=${search}`}>
                <Button variant="outline" size="sm">Previous</Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/volunteers?page=${page + 1}&search=${search}`}>
                <Button variant="outline" size="sm">Next</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
