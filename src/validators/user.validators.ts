import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "scorekeeper"]);

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("A valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: userRoleSchema,
});

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: userRoleSchema,
});

export type CreateUserValues = z.infer<typeof createUserSchema>;
export type UpdateUserRoleValues = z.infer<typeof updateUserRoleSchema>;
