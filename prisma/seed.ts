/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Role } from "../lib/enums";
import bcrypt from "bcryptjs";

const prisma: any = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Organization + admin
  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: {
      name: "Demo Organization",
      slug: "demo-org",
    },
  });

  const adminPassword = await bcrypt.hash("password123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@example.com",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      organizationId: org.id,
    },
  });

  const leaderPassword = await bcrypt.hash("password123", 12);
  const leader1 = await prisma.user.upsert({
    where: { email: "leader1@example.com" },
    update: {},
    create: {
      name: "Alex Leader",
      email: "leader1@example.com",
      passwordHash: leaderPassword,
      role: Role.TEAM_LEADER,
      organizationId: org.id,
    },
  });

  const leader2 = await prisma.user.upsert({
    where: { email: "leader2@example.com" },
    update: {},
    create: {
      name: "Jordan Leader",
      email: "leader2@example.com",
      passwordHash: leaderPassword,
      role: Role.TEAM_LEADER,
      organizationId: org.id,
    },
  });

  // Categories
  const [catParking, catGreeting, catSetup, catFundraising] = await Promise.all([
    prisma.category.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "Parking" } },
      update: {},
      create: { name: "Parking", color: "#6366f1", organizationId: org.id },
    }),
    prisma.category.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "Greeting" } },
      update: {},
      create: { name: "Greeting", color: "#22c55e", organizationId: org.id },
    }),
    prisma.category.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "Setup & Cleanup" } },
      update: {},
      create: { name: "Setup & Cleanup", color: "#f59e0b", organizationId: org.id },
    }),
    prisma.category.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "Fundraising" } },
      update: {},
      create: { name: "Fundraising", color: "#ec4899", organizationId: org.id },
    }),
  ]);

  // Teams
  const teamParking = await prisma.team.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Parking Team" } },
    update: {},
    create: {
      name: "Parking Team",
      description: "Manages vehicle flow and lot safety",
      organizationId: org.id,
      categoryId: catParking.id,
      leaderId: leader1.id,
    },
  });

  const teamFundraising = await prisma.team.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Fundraising Team" } },
    update: {},
    create: {
      name: "Fundraising Team",
      description: "Coordinates fundraising events and campaigns",
      organizationId: org.id,
      categoryId: catFundraising.id,
      leaderId: leader2.id,
    },
  });

  // Volunteers (20 sample volunteers)
  const volunteerData = [
    { firstName: "Alice", lastName: "Johnson", phone: "+15550001001", skills: ["driving"] },
    { firstName: "Bob", lastName: "Smith", phone: "+15550001002", skills: [] },
    { firstName: "Carol", lastName: "Williams", phone: "+15550001003", skills: ["first-aid"] },
    { firstName: "David", lastName: "Brown", phone: "+15550001004", skills: ["driving", "first-aid"] },
    { firstName: "Eve", lastName: "Jones", phone: "+15550001005", skills: [] },
    { firstName: "Frank", lastName: "Garcia", phone: "+15550001006", skills: ["leadership"] },
    { firstName: "Grace", lastName: "Miller", phone: "+15550001007", skills: ["accounting"] },
    { firstName: "Henry", lastName: "Davis", phone: "+15550001008", skills: [] },
    { firstName: "Iris", lastName: "Martinez", phone: "+15550001009", skills: ["event-planning"] },
    { firstName: "Jack", lastName: "Wilson", phone: "+15550001010", skills: ["driving"] },
  ];

  const volunteers = await Promise.all(
    volunteerData.map((v) =>
      prisma.volunteer.upsert({
        where: { organizationId_phone: { organizationId: org.id, phone: v.phone } },
        update: {},
        create: {
          ...v,
          organizationId: org.id,
        },
      })
    )
  );

  // Add first 6 volunteers to parking team, last 5 to fundraising
  await Promise.all([
    ...volunteers.slice(0, 6).map((v) =>
      prisma.teamMembership.upsert({
        where: { teamId_volunteerId: { teamId: teamParking.id, volunteerId: v.id } },
        update: {},
        create: { teamId: teamParking.id, volunteerId: v.id },
      })
    ),
    ...volunteers.slice(5).map((v) =>
      prisma.teamMembership.upsert({
        where: { teamId_volunteerId: { teamId: teamFundraising.id, volunteerId: v.id } },
        update: {},
        create: { teamId: teamFundraising.id, volunteerId: v.id },
      })
    ),
  ]);

  // Task templates
  await prisma.taskTemplate.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Weekly Parking Duty" } },
    update: {},
    create: {
      name: "Weekly Parking Duty",
      description: "Direct traffic and assist with parking",
      organizationId: org.id,
      categoryId: catParking.id,
      rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=SU",
      defaultMessage:
        "Hi {{volunteer_name}}, you're needed for {{task_name}} on {{task_date}}. Reply 1 to confirm or 2 to decline.",
    },
  });

  // Sample upcoming task
  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + ((7 - nextSunday.getDay()) % 7 || 7));
  nextSunday.setHours(8, 0, 0, 0);

  const task = await prisma.task.create({
    data: {
      name: "Sunday Parking Duty",
      description: "Help direct traffic before and after the event",
      scheduledAt: nextSunday,
      status: "SCHEDULED",
      organizationId: org.id,
      categoryId: catParking.id,
      teamId: teamParking.id,
    },
  });

  console.log(`
Seed complete!

Login credentials:
  Admin:       admin@example.com  / password123
  Team Leader: leader1@example.com / password123
  Team Leader: leader2@example.com / password123

Created:
  - Organization: "${org.name}"
  - ${volunteers.length} volunteers
  - 2 teams (Parking, Fundraising)
  - 1 task template
  - 1 upcoming task
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
