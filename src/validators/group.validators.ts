import { z } from "zod";

export const GROUP_NAMES = ["A", "B", "C", "D"] as const;
export const GROUP_COUNT_MIN = 1;
export const GROUP_COUNT_MAX = 4;

export const generateCategoryGroupsSchema = z.object({
  seasonId: z.string().min(1),
  categoryId: z.string().min(1),
  groups: z
    .array(
      z.object({
        name: z.string().min(1),
        teamIds: z.array(z.string().min(1)),
        gamesPerTeam: z.number().int().min(0),
      }),
    )
    .min(1)
    .max(GROUP_COUNT_MAX),
});

export type GenerateCategoryGroupsValues = z.infer<typeof generateCategoryGroupsSchema>;
