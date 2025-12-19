import { z } from "zod";

export const seasonStateEnum = z.enum([
  "draft",
  "signup_open",
  "signup_closed",
  "active",
  "completed",
]);

export type SeasonState = z.infer<typeof seasonStateEnum>;

export const createSeasonSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  state: seasonStateEnum.optional().default("draft"),
});

export const updateSeasonSchema = createSeasonSchema.partial();

export const updateSeasonStateSchema = z.object({
  id: z.string(),
  state: seasonStateEnum,
});

export type CreateSeasonValues = z.infer<typeof createSeasonSchema>;
export type UpdateSeasonValues = z.infer<typeof updateSeasonSchema>;
export type UpdateSeasonStateValues = z.infer<typeof updateSeasonStateSchema>;
