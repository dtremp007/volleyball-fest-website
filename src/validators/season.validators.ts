import { z } from "zod";

export const createSeasonSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

export const updateSeasonSchema = createSeasonSchema.partial();

export type CreateSeasonValues = z.infer<typeof createSeasonSchema>;
export type UpdateSeasonValues = z.infer<typeof updateSeasonSchema>;
