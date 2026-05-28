// Enum constants matching the Prisma schema enums
// Use these for value comparisons; the generated Prisma 6 client uses string literals

export const Role = {
  ADMIN: "ADMIN",
  TEAM_LEADER: "TEAM_LEADER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const TaskStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const AssignmentStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  DECLINED: "DECLINED",
  NO_RESPONSE: "NO_RESPONSE",
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const SmsDirection = {
  OUTBOUND: "OUTBOUND",
  INBOUND: "INBOUND",
} as const;
export type SmsDirection = (typeof SmsDirection)[keyof typeof SmsDirection];
