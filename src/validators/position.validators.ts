import { z } from "zod";

export const createPositionSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const updatePositionSchema = createPositionSchema.partial();

export type CreatePositionValues = z.infer<typeof createPositionSchema>;
export type UpdatePositionValues = z.infer<typeof updatePositionSchema>;
