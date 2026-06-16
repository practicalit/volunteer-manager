import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { volunteerSchema } from "@/lib/validations";
import { normalizePhone } from "@/lib/utils";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const teamId = searchParams.get("teamId");

  const where = {
    organizationId: session.user.organizationId,
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(teamId && { teamMemberships: { some: { teamId } } }),
  };

  const [volunteers, total] = await Promise.all([
    prisma.volunteer.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: {
        teamMemberships: { include: { team: { include: { category: true } } } },
        _count: { select: { assignments: true } },
      },
    }),
    prisma.volunteer.count({ where }),
  ]);

  return NextResponse.json({ volunteers, total, page, limit });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = volunteerSchema.parse(body);

    // Deduplicate and validate that every supplied category belongs to this org.
    const uniqueCategoryIds = [...new Set(data.categoryIds ?? [])];
    if (uniqueCategoryIds.length > 0) {
      const validCount = await prisma.category.count({
        where: { id: { in: uniqueCategoryIds }, organizationId: session.user.organizationId },
      });
      if (validCount !== uniqueCategoryIds.length) {
        return NextResponse.json({ error: "One or more invalid category IDs" }, { status: 400 });
      }
    }

    const volunteer = await prisma.volunteer.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: normalizePhone(data.phone),
        email: data.email || null,
        skills: data.skills || [],
        notes: data.notes || null,
        availability: data.availability ?? [],
        organizationId: session.user.organizationId,
        categories: uniqueCategoryIds.length
          ? { create: uniqueCategoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
      },
    });

    return NextResponse.json(volunteer, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
}
