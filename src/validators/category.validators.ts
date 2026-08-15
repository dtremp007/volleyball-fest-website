import { z } from "zod";
import { normalizeCategoryColor } from "~/lib/category-color";

export const categoryColorSchema = z.string().transform((value, ctx) => {
  const color = normalizeCategoryColor(value);
  if (!color) {
    ctx.addIssue({
      code: "custom",
      message: "Color must be a hex value like #000000",
    });
    return z.NEVER;
  }
  return color;
});

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  color: categoryColorSchema,
  sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export type CreateCategoryValues = z.infer<typeof createCategorySchema>;
export type UpdateCategoryValues = z.infer<typeof updateCategorySchema>;
