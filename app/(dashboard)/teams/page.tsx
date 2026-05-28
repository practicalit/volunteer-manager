// @ts-nocheck
// @ts-nocheck
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { CreateTeamButton } from "./create-team-button";

export default async function TeamsPage() {
  const session = await requireAuth();
  const orgId = session.user.organizationId;

  const [teams, categories, users] = await Promise.all([
    prisma.team.findMany({
      where: { category: { organizationId: orgId } },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      include: {
        category: true,
        leader: { select: { id: true, name: true } },
        _count: { select: { memberships: true, tasks: true } },
      },
    }),
    prisma.category.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-sm text-gray-500">{teams.length} teams across {categories.length} categories</p>
        </div>
        <CreateTeamButton categories={categories} users={users} />
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-gray-500">No teams yet. Create a category first, then add teams.</p>
            <Link href="/categories" className="mt-2 text-sm text-indigo-600 hover:underline">
              Go to Categories
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: team.category.color }} />
                    <Badge variant="outline" style={{ borderColor: team.category.color, color: team.category.color }}>
                      {team.category.name}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-gray-900">{team.name}</h3>
                  {team.description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{team.description}</p>
                  )}
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span>{team._count.memberships} members</span>
                    <span className="text-xs text-gray-400">Lead: {team.leader.name}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
