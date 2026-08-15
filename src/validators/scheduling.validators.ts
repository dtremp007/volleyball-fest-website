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
