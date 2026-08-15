import { z } from "zod";

export const schedulingWeightsSchema = z.object({
  eventCategoryBalance: z.number(),
  eventLoadBalance: z.number(),
  farAwaySchedulingPriority: z.number(),
  teamRestAdjacentEvent: z.number(),
  categoryTimePreference: z.number(),
  categoryCourtClustering: z.number(),
  categoryDistributionRun: z.number(),
  maxGamesPerEvent: z.number().int().positive(),
  farAwayMaxGamesPerEvent: z.number().int().positive(),
  categoryTimeCurveExponent: z.number().positive(),
});

export type SchedulingWeights = z.infer<typeof schedulingWeightsSchema>;

export const DEFAULT_SCHEDULING_WEIGHTS: SchedulingWeights = {
  eventCategoryBalance: 20,
  eventLoadBalance: 15,
  farAwaySchedulingPriority: 12,
  teamRestAdjacentEvent: 10,
  categoryTimePreference: 10,
  categoryCourtClustering: 8,
  categoryDistributionRun: 3,
  maxGamesPerEvent: 2,
  farAwayMaxGamesPerEvent: 2,
  categoryTimeCurveExponent: 2,
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

const LEGACY_WEIGHT_KEYS: Record<string, keyof SchedulingWeights> = {
  femenilEarlyPerSlot: "categoryTimePreference",
  femenilCourtClustering: "categoryCourtClustering",
  femenilEarlyCurveExponent: "categoryTimeCurveExponent",
};

export function migrateLegacySchedulingWeights(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const source = value as Record<string, unknown>;
  const migrated: Record<string, unknown> = { ...source };

  for (const [legacyKey, nextKey] of Object.entries(LEGACY_WEIGHT_KEYS)) {
    if (migrated[nextKey] === undefined && migrated[legacyKey] !== undefined) {
      migrated[nextKey] = migrated[legacyKey];
    }
    delete migrated[legacyKey];
  }

  delete migrated.varonilLatePerSlot;

  return migrated;
}

export function parseSchedulePresetWeights(weightsJson: string): SchedulingWeights {
  let parsed: unknown;
  try {
    parsed = JSON.parse(weightsJson);
  } catch {
    throw new Error("Invalid schedule preset weights JSON");
  }

  const result = schedulingWeightsSchema.safeParse(
    resolveSchedulingWeights(
      migrateLegacySchedulingWeights(parsed) as Partial<SchedulingWeights>,
    ),
  );
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

export const scheduleDraftPlacementSchema = z.object({
  id: z.string(),
  teamAId: z.string(),
  teamBId: z.string(),
  eventId: z.string(),
  courtId: z.enum(["A", "B"]),
  slotIndex: z.number().int(),
  categoryId: z.string().nullable(),
});

export const schedulingMetricsSchema = z.object({
  qualityScore: z.number(),
  totalCategoryDeviation: z.number(),
  courtCategorySwitches: z.number().default(0),
  hardConflictCount: z.number().default(0),
  categoryCountsByEventId: z.record(z.string(), z.record(z.string(), z.number())),
  gamesPerEventSpread: z.number(),
  farAwayTwoGamesHitRate: z.number(),
  unscheduledCount: z.number(),
  scheduledCount: z.number(),
});

export const solverEffortSchema = z.enum(["greedy", "low", "medium", "high"]);

export const generateScheduleCandidatesSchema = z.object({
  seasonId: z.string(),
  count: z.number().int().min(1).max(8).default(3),
  presetIds: z.array(z.string()).optional(),
  weights: partialSchedulingWeightsSchema.optional(),
  dates: z.array(z.string().min(1, "Date cannot be empty")).optional(),
  defaultStartTime: z.string().optional(),
  gamesPerEvening: z.number().int().positive().optional(),
  effort: solverEffortSchema.optional(),
});

export type GenerateScheduleCandidatesValues = z.infer<
  typeof generateScheduleCandidatesSchema
>;

export function parseScheduleDraftPlacements(placementsJson: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(placementsJson);
  } catch {
    throw new Error("Invalid schedule draft placements JSON");
  }

  const result = z.array(scheduleDraftPlacementSchema).safeParse(parsed);
  if (!result.success) {
    throw new Error("Invalid schedule draft placements");
  }

  return result.data;
}

export function parseScheduleDraftMetrics(metricsJson: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(metricsJson);
  } catch {
    throw new Error("Invalid schedule draft metrics JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid schedule draft metrics");
  }

  const source = parsed as Record<string, unknown>;
  const result = schedulingMetricsSchema.safeParse({
    ...source,
    courtCategorySwitches:
      source.courtCategorySwitches ?? source.estimatedFemenilNetSwitches ?? 0,
    hardConflictCount: source.hardConflictCount ?? 0,
  });
  if (!result.success) {
    throw new Error("Invalid schedule draft metrics");
  }

  return result.data;
}
