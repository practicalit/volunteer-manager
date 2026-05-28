import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const taskId = searchParams.get("taskId");
  const volunteerId = searchParams.get("volunteerId");

  const assignments = await prisma.assignment.findMany({
    where: {
      task: { organizationId: session.user.organizationId },
      ...(status && { status: status as "PENDING" | "CONFIRMED" | "DECLINED" | "NO_RESPONSE" }),
      ...(taskId && { taskId }),
      ...(volunteerId && { volunteerId }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      task: { include: { category: true } },
      volunteer: true,
    },
  });

  return NextResponse.json(assignments);
}
