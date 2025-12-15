import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryValues = z.infer<typeof createCategorySchema>;
export type UpdateCategoryValues = z.infer<typeof updateCategorySchema>;
