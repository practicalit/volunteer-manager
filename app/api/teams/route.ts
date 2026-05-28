import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { teamSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teams = await prisma.team.findMany({
    where: { category: { organizationId: session.user.organizationId } },
    orderBy: { name: "asc" },
    include: {
      category: true,
      leader: { select: { id: true, name: true, email: true } },
      _count: { select: { memberships: true, tasks: true } },
    },
  });

  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = teamSchema.parse(body);

    // Verify category belongs to org
    const cat = await prisma.category.findFirst({
      where: { id: data.categoryId, organizationId: session.user.organizationId },
    });
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    const team = await prisma.team.create({
      data: { ...data, organizationId: session.user.organizationId },
      include: { category: true, leader: { select: { id: true, name: true } } },
    });

    return NextResponse.json(team, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
