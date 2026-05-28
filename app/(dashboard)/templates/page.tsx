import { requireAuth } from "@/lib/session";
import prisma from "@/lib/prisma";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage() {
  const session = await requireAuth();
  const orgId = session.user.organizationId;

  const [templates, categories] = await Promise.all([
    prisma.taskTemplate.findMany({
      where: { organizationId: orgId },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { organizationId: orgId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <TemplatesClient
      templates={templates}
      categories={categories}
    />
  );
}
