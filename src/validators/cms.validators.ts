import { z } from "zod";
import { cmsValueTypeEnum } from "~/lib/db/schema/cms.schema";

export const cmsValueTypeSchema = z.enum(cmsValueTypeEnum);

export const createCmsEntrySchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.string().nullable().optional(),
  valueType: cmsValueTypeSchema,
  meta: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
});

export const updateCmsEntrySchema = z.object({
  name: z.string().min(1).optional(),
  value: z.string().nullable().optional(),
  valueType: cmsValueTypeSchema.optional(),
  meta: z.string().nullable().optional(),
});

export const updateContentSchema = z.object({
  rootKey: z.string().min(1),
  path: z.string().min(1),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.any()),
    z.record(z.string(), z.any()),
  ]),
});

export type CreateCmsEntryInput = z.infer<typeof createCmsEntrySchema>;
export type UpdateCmsEntryInput = z.infer<typeof updateCmsEntrySchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
