import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validations";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const cat = await prisma.category.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data = categorySchema.partial().parse(body);
  const updated = await prisma.category.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const cat = await prisma.category.findFirst({
    where: { id, organizationId: session.user.organizationId },
  });
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
