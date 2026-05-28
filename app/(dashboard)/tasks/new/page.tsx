import { requireAuth } from "@/lib/session";
import prisma from "@/lib/prisma";
import { NewTaskForm } from "./new-task-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Props {
  searchParams: { teamId?: string };
}

export default async function NewTaskPage({ searchParams }: Props) {
  const session = await requireAuth();
  const orgId = session.user.organizationId;

  const [categories, teams, templates] = await Promise.all([
    prisma.category.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
    prisma.team.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
    prisma.taskTemplate.findMany({ where: { organizationId: orgId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/tasks" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
          <ChevronLeft className="h-4 w-4" /> Back to tasks
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">New Task</h1>
      </div>
      <NewTaskForm
        categories={categories}
        teams={teams}
        templates={templates}
        defaultTeamId={searchParams.teamId}
      />
    </div>
  );
}
