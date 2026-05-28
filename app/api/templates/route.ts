import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { taskTemplateSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.taskTemplate.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { name: "asc" },
    include: {
      category: true,
      _count: { select: { tasks: true } },
    },
  });

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = taskTemplateSchema.parse(body);

    const template = await prisma.taskTemplate.create({
      data: { ...data, organizationId: session.user.organizationId },
      include: { category: true },
    });

    return NextResponse.json(template, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
