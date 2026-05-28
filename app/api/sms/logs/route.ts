import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const direction = searchParams.get("direction");

  const [logs, total] = await Promise.all([
    prisma.smsLog.findMany({
      where: {
        OR: [
          { volunteer: { organizationId: session.user.organizationId } },
          { sentBy: { organizationId: session.user.organizationId } },
        ],
        ...(direction && { direction: direction as "OUTBOUND" | "INBOUND" }),
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        volunteer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        sentBy: { select: { id: true, name: true } },
        assignment: { include: { task: { select: { id: true, name: true, scheduledAt: true } } } },
      },
    }),
    prisma.smsLog.count({
      where: {
        OR: [
          { volunteer: { organizationId: session.user.organizationId } },
          { sentBy: { organizationId: session.user.organizationId } },
        ],
        ...(direction && { direction: direction as "OUTBOUND" | "INBOUND" }),
      },
    }),
  ]);

  return NextResponse.json({ logs, total, page, limit });
}
