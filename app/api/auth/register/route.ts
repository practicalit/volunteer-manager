import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    // Check org slug is unique
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: data.organizationSlug },
    });
    if (existingOrg) {
      return NextResponse.json({ error: "Organization slug is already taken" }, { status: 400 });
    }

    // Check email is unique
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email is already in use" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const org = await prisma.organization.create({
      data: {
        name: data.organizationName,
        slug: data.organizationSlug,
        users: {
          create: {
            name: data.name,
            email: data.email,
            passwordHash,
            role: "ADMIN",
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json({ organizationId: org.id }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
