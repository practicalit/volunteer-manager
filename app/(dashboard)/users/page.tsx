// @ts-nocheck
// @ts-nocheck
import { requireAdmin } from "@/lib/session";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const session = await requireAdmin();

  const users = await prisma.user.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      managedTeams: { select: { id: true, name: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <UsersClient
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        teams: u.managedTeams,
      }))}
      currentUserId={session.user.id}
    />
  );
}
