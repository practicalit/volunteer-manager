import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== Role.ADMIN) redirect("/dashboard");
  return session;
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });
}
