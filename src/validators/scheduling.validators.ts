import { z } from "zod";

export const schedulingWeightsSchema = z.object({
  eventCategoryBalance: z.number(),
  eventLoadBalance: z.number(),
  farAwaySchedulingPriority: z.number(),
  teamRestAdjacentEvent: z.number(),
  femenilEarlyPerSlot: z.number(),
  femenilCourtClustering: z.number(),
  categoryDistributionRun: z.number(),
  varonilLatePerSlot: z.number(),
  maxGamesPerEvent: z.number().int().positive(),
  farAwayMaxGamesPerEvent: z.number().int().positive(),
  femenilEarlyCurveExponent: z.number().positive(),
});

export type SchedulingWeights = z.infer<typeof schedulingWeightsSchema>;

export const DEFAULT_SCHEDULING_WEIGHTS: SchedulingWeights = {
  eventCategoryBalance: 20,
  eventLoadBalance: 15,
  farAwaySchedulingPriority: 12,
  teamRestAdjacentEvent: 10,
  femenilEarlyPerSlot: 10,
  femenilCourtClustering: 8,
  categoryDistributionRun: 3,
  varonilLatePerSlot: 1,
  maxGamesPerEvent: 2,
  farAwayMaxGamesPerEvent: 2,
  femenilEarlyCurveExponent: 2,
};

export const partialSchedulingWeightsSchema = schedulingWeightsSchema.partial();

export function resolveSchedulingWeights(
  partial?: Partial<SchedulingWeights>,
): SchedulingWeights {
  return {
    ...DEFAULT_SCHEDULING_WEIGHTS,
    ...partial,
  };
}

export function parseSchedulePresetWeights(weightsJson: string): SchedulingWeights {
  let parsed: unknown;
  try {
    parsed = JSON.parse(weightsJson);
  } catch {
    throw new Error("Invalid schedule preset weights JSON");
  }

  const result = schedulingWeightsSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("Invalid schedule preset weights");
  }

  return result.data;
}

export const saveSchedulePresetSchema = z.object({
  seasonId: z.string(),
  name: z.string().min(1),
  weights: schedulingWeightsSchema,
  setActive: z.boolean().optional(),
});

export type SaveSchedulePresetValues = z.infer<typeof saveSchedulePresetSchema>;
