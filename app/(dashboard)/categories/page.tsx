import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CategoriesClient } from "./categories-client";

export default async function CategoriesPage() {
  const session = await requireAuth();

  const categories = await prisma.category.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { name: "asc" },
    include: { _count: { select: { teams: true, tasks: true } } },
  });

  return <CategoriesClient initialCategories={categories} />;
}
