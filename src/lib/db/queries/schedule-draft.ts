import { format } from "date-fns";
import { desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Database } from "~/lib/db";
import {
  clearMatchupPlacementsForSeason,
  createEvent,
  deleteEvent,
  generateMatchupsForSeason,
  getEventsBySeasonId,
  getScheduleConfig,
  hasMatchupsForSeason,
  loadSolveScheduleContext,
} from "~/lib/db/queries/schedule";
import {
  getActiveSchedulePreset,
  getSchedulePresetById,
  resolveScheduleWeightsForSeason,
} from "~/lib/db/queries/schedule-preset";
import * as schema from "~/lib/db/schema";
import { combineDateAndTime } from "~/lib/schedule/slot-times";
import {
  solveSchedule,
  type SchedulingMetrics,
  type SolveScheduleInput,
} from "~/lib/scheduling/solver";
import {
  parseScheduleDraftMetrics,
  parseScheduleDraftPlacements,
  parseSchedulePresetWeights,
  resolveSchedulingWeights,
  type SchedulingWeights,
} from "~/validators/scheduling.validators";

const EMPTY_METRICS: SchedulingMetrics = {
  qualityScore: 0,
  totalCategoryDeviation: 0,
  estimatedFemenilNetSwitches: 0,
  categoryCountsByEventId: {},
  gamesPerEventSpread: 0,
  farAwayTwoGamesHitRate: 0,
  unscheduledCount: 0,
  scheduledCount: 0,
};

export const getScheduleDrafts = async (db: Database, seasonId: string) => {
  return await db
    .select()
    .from(schema.scheduleDraft)
    .where(eq(schema.scheduleDraft.seasonId, seasonId))
    .orderBy(desc(schema.scheduleDraft.createdAt));
};

export const getScheduleDraftById = async (db: Database, id: string) => {
  const [draft] = await db
    .select()
    .from(schema.scheduleDraft)
    .where(eq(schema.scheduleDraft.id, id));
  return draft;
};

type CreateScheduleDraftParams = {
  seasonId: string;
  name: string;
  presetName?: string | null;
  weightsJson: string;
  seed: number;
  placementsJson: string;
  metricsJson: string;
  unscheduledCount: number;
};

export const createScheduleDraft = async (
  db: Database,
  params: CreateScheduleDraftParams,
) => {
  const [draft] = await db
    .insert(schema.scheduleDraft)
    .values({
      id: uuidv4(),
      seasonId: params.seasonId,
      name: params.name,
      presetName: params.presetName ?? null,
      weightsJson: params.weightsJson,
      seed: params.seed,
      placementsJson: params.placementsJson,
      metricsJson: params.metricsJson,
      unscheduledCount: params.unscheduledCount,
    })
    .returning();
  if (!draft) {
    throw new Error("Failed to create schedule draft");
  }
  return draft;
};

export const deleteScheduleDraft = async (db: Database, id: string) => {
  const [draft] = await db
    .delete(schema.scheduleDraft)
    .where(eq(schema.scheduleDraft.id, id))
    .returning();
  return draft;
};

export const clearScheduleDrafts = async (db: Database, seasonId: string) => {
  const deleted = await db
    .delete(schema.scheduleDraft)
    .where(eq(schema.scheduleDraft.seasonId, seasonId))
    .returning({ id: schema.scheduleDraft.id });
  return { deletedCount: deleted.length };
};

export function toScheduleDraftView<
  T extends {
    weightsJson: string;
    placementsJson: string;
    metricsJson: string;
  },
>(draft: T) {
  return {
    ...draft,
    weights: parseSchedulePresetWeights(draft.weightsJson),
    placements: parseScheduleDraftPlacements(draft.placementsJson),
    metrics: parseScheduleDraftMetrics(draft.metricsJson),
  };
}

export type GenerateScheduleCandidatesParams = {
  seasonId: string;
  count?: number;
  presetIds?: string[];
  weights?: Partial<SchedulingWeights>;
  dates?: string[];
  defaultStartTime?: string;
  gamesPerEvening?: number;
};

export async function generateScheduleCandidates(
  db: Database,
  params: GenerateScheduleCandidatesParams,
) {
  const seasonId = params.seasonId;
  const count = Math.min(8, Math.max(1, params.count ?? 3));
  const dates = params.dates
    ? [...new Set(params.dates.map((date) => date.trim()).filter(Boolean))]
    : [];

  const scheduleConfig = await getScheduleConfig(db, seasonId);
  const gamesPerEvening = params.gamesPerEvening ?? scheduleConfig?.gamesPerEvening ?? 7;
  const defaultStartTime =
    params.defaultStartTime ?? scheduleConfig?.defaultStartTime ?? "4:15 PM";

  if (dates.length > 0) {
    const hasMatchups = await hasMatchupsForSeason(db, seasonId);
    if (!hasMatchups) {
      await generateMatchupsForSeason(db, seasonId);
    }

    const existingEvents = await getEventsBySeasonId(db, seasonId);
    for (const event of existingEvents) {
      await deleteEvent(db, event.id);
    }

    for (const date of dates) {
      await createEvent(db, {
        seasonId,
        name: format(new Date(`${date}T12:00:00`), "MMM d, yyyy"),
        date: combineDateAndTime(date, defaultStartTime),
      });
    }
  } else {
    const hasMatchups = await hasMatchupsForSeason(db, seasonId);
    if (!hasMatchups) {
      await generateMatchupsForSeason(db, seasonId);
    }
  }

  const events = await getEventsBySeasonId(db, seasonId);
  if (events.length === 0) {
    throw new Error(
      "No schedule events found. Provide dates or create events for this season first.",
    );
  }

  const eventIds = events.map((event) => event.id);
  const presetIds = params.presetIds?.filter(Boolean) ?? [];

  await clearScheduleDrafts(db, seasonId);

  type CandidatePreset = { name: string; weights: SchedulingWeights };
  let cyclingPresets: CandidatePreset[] | null = null;
  let sharedWeights: SchedulingWeights | null = null;
  let sharedPresetName = "Defaults";

  if (presetIds.length > 0) {
    cyclingPresets = [];
    for (const presetId of presetIds) {
      const preset = await getSchedulePresetById(db, presetId);
      if (!preset || preset.seasonId !== seasonId) {
        throw new Error("Schedule preset not found for this season");
      }
      cyclingPresets.push({
        name: preset.name,
        weights: resolveSchedulingWeights({
          ...parseSchedulePresetWeights(preset.weightsJson),
          ...params.weights,
        }),
      });
    }
  } else {
    sharedWeights = await resolveScheduleWeightsForSeason(db, seasonId, {
      weights: params.weights,
    });
    if (params.weights) {
      sharedPresetName = "Custom";
    } else {
      const activePreset = await getActiveSchedulePreset(db, seasonId);
      sharedPresetName = activePreset?.name ?? "Defaults";
    }
  }

  const seedBase = Math.floor(Math.random() * 1e9);
  const contextByWeights = new Map<string, SolveScheduleInput | null>();
  const drafts = [];

  for (let i = 0; i < count; i++) {
    const preset = cyclingPresets?.[i % cyclingPresets.length];
    const weights = preset?.weights ?? sharedWeights;
    if (!weights) {
      throw new Error("Could not resolve scheduling weights");
    }
    const presetName = preset?.name ?? sharedPresetName;
    const weightsKey = JSON.stringify(weights);

    if (!contextByWeights.has(weightsKey)) {
      contextByWeights.set(
        weightsKey,
        await loadSolveScheduleContext(db, seasonId, eventIds, weights),
      );
    }

    const input = contextByWeights.get(weightsKey) ?? null;
    const seed = (seedBase ^ (i * 10007)) >>> 0;
    const result = input
      ? solveSchedule({
          ...input,
          gamesPerEvening,
          weights,
          seed,
        })
      : {
          placements: [],
          metrics: EMPTY_METRICS,
          unscheduledMatchupIds: [],
        };

    const draft = await createScheduleDraft(db, {
      seasonId,
      name: `Candidate ${i + 1}`,
      presetName,
      weightsJson: JSON.stringify(weights),
      seed,
      placementsJson: JSON.stringify(result.placements),
      metricsJson: JSON.stringify(result.metrics),
      unscheduledCount: result.unscheduledMatchupIds.length,
    });

    drafts.push(toScheduleDraftView(draft));
  }

  return drafts;
}

export async function applyScheduleDraft(db: Database, draftId: string) {
  const draft = await getScheduleDraftById(db, draftId);
  if (!draft) {
    throw new Error("Schedule draft not found");
  }

  const placements = parseScheduleDraftPlacements(draft.placementsJson);
  const metrics = parseScheduleDraftMetrics(draft.metricsJson);

  await clearMatchupPlacementsForSeason(db, draft.seasonId);

  for (const placement of placements) {
    await db
      .update(schema.matchup)
      .set({
        eventId: placement.eventId,
        courtId: placement.courtId,
        slotIndex: placement.slotIndex,
      })
      .where(eq(schema.matchup.id, placement.id));
  }

  return {
    scheduledCount: placements.length,
    unscheduledCount: draft.unscheduledCount,
    seasonId: draft.seasonId,
    metrics,
  };
}
