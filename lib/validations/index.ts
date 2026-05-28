import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organizationName: z.string().min(2, "Organization name is required"),
  organizationSlug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
});

export const volunteerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z
    .string()
    .min(10, "Phone number is required")
    .regex(/^[\d\s\-\+\(\)]+$/, "Invalid phone number"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  skills: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color").optional(),
});

export const teamSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  leaderId: z.string().min(1, "Team leader is required"),
});

export const taskTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  defaultMessage: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
});

export const taskSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  teamId: z.string().optional(),
  templateId: z.string().optional(),
  scheduledAt: z.string().min(1, "Scheduled date is required"),
  isRecurring: z.boolean().optional(),
  recurrenceRule: z.string().optional(),
  customMessage: z.string().optional(),
});

export const assignmentSchema = z.object({
  taskId: z.string().min(1, "Task is required"),
  volunteerIds: z.array(z.string()).min(1, "At least one volunteer is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type VolunteerInput = z.infer<typeof volunteerSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type TeamInput = z.infer<typeof teamSchema>;
export type TaskTemplateInput = z.infer<typeof taskTemplateSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
