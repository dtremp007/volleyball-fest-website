import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Database } from "~/lib/db";
import {
  DEFAULT_MAX_GAMES_PER_EVENT,
  FAR_AWAY_MAX_GAMES_PER_EVENT,
  evaluatePlacementSwap,
  getEstimatedFemenilNetSwitchCount,
  getPlacementPreferenceScore,
  getScheduleQualityScore,
  getPlacementViolationReason,
  type CategoryBalanceContext,
  type ConstraintValidationContext,
  type PlacementWithCategory,
  type ScheduledMatchupPlacement,
} from "~/lib/db/queries/schedule-algorithm";
import * as schema from "~/lib/db/schema";
import { normalizeDateOnly } from "~/lib/unavailable-dates";

const CATEGORY_BALANCE_MAX_PASSES = 6;
const FEMENIL_CLUSTERING_MAX_PASSES = 6;
const GENERAL_SWAP_MAX_PASSES = 8;
const MAX_SWAP_EVALUATIONS_PER_PASS = 1200;

// ============== Schedule Config ==============

export async function getScheduleConfig(db: Database, seasonId: string) {
  const [config] = await db
    .select({
      id: schema.scheduleConfig.id,
      seasonId: schema.scheduleConfig.seasonId,
      defaultStartTime: schema.scheduleConfig.defaultStartTime,
      gamesPerEvening: schema.scheduleConfig.gamesPerEvening,
    })
    .from(schema.scheduleConfig)
    .where(eq(schema.scheduleConfig.seasonId, seasonId))
    .limit(1);

  return config ?? null;
}

export async function upsertScheduleConfig(
  db: Database,
  params: {
    seasonId: string;
    defaultStartTime: string;
    gamesPerEvening: number;
  },
) {
  const existing = await getScheduleConfig(db, params.seasonId);

  if (existing) {
    await db
      .update(schema.scheduleConfig)
      .set({
        defaultStartTime: params.defaultStartTime,
        gamesPerEvening: params.gamesPerEvening,
      })
      .where(eq(schema.scheduleConfig.id, existing.id));
    return { id: existing.id, ...params };
  } else {
    const id = uuidv4();
    await db.insert(schema.scheduleConfig).values({ id, ...params });
    return { id, ...params };
  }
}

// ============== Events ==============

export async function getEventsBySeasonId(db: Database, seasonId: string) {
  return await db
    .select({
      id: schema.scheduleEvent.id,
      name: schema.scheduleEvent.name,
      date: schema.scheduleEvent.startTime,
      seasonId: schema.scheduleEvent.seasonId,
    })
    .from(schema.scheduleEvent)
    .where(eq(schema.scheduleEvent.seasonId, seasonId));
}

export async function createEvent(
  db: Database,
  params: { name: string; date: string; seasonId: string },
) {
  const id = uuidv4();
  await db.insert(schema.scheduleEvent).values({
    id,
    name: params.name,
    startTime: params.date,
    seasonId: params.seasonId,
  });
  return { id, ...params };
}

export async function updateEvent(
  db: Database,
  id: string,
  params: { name?: string; date?: string },
) {
  const updateData: { name?: string; startTime?: string } = {};
  if (params.name !== undefined) {
    updateData.name = params.name;
  }
  if (params.date !== undefined) {
    updateData.startTime = params.date;
  }
  await db
    .update(schema.scheduleEvent)
    .set(updateData)
    .where(eq(schema.scheduleEvent.id, id));
}

export async function deleteEvent(db: Database, id: string) {
  // First unschedule all matchups for this event
  await db
    .update(schema.matchup)
    .set({ eventId: null, courtId: null, slotIndex: null })
    .where(eq(schema.matchup.eventId, id));

  // Then delete the event
  await db.delete(schema.scheduleEvent).where(eq(schema.scheduleEvent.id, id));
}

// ============== Matchups ==============

export async function getMatchupsBySeasonId(db: Database, seasonId: string) {
  const matchups = await db
    .select({
      id: schema.matchup.id,
      teamAId: schema.matchup.teamAId,
      teamBId: schema.matchup.teamBId,
      seasonId: schema.matchup.seasonId,
      eventId: schema.matchup.eventId,
      courtId: schema.matchup.courtId,
      slotIndex: schema.matchup.slotIndex,
      bestOf: schema.matchup.bestOf,
      teamAName: schema.team.name,
      teamALogo: schema.team.logoUrl,
      teamAUnavailableDates: schema.team.unavailableDates,
      teamAIsFarAway: schema.team.isFarAway,
    })
    .from(schema.matchup)
    .innerJoin(schema.team, eq(schema.matchup.teamAId, schema.team.id))
    .where(eq(schema.matchup.seasonId, seasonId));

  // Get team B info in a second query (drizzle limitation with multiple joins to same table)
  const teamBInfo = await db
    .select({
      matchupId: schema.matchup.id,
      teamBName: schema.team.name,
      teamBLogo: schema.team.logoUrl,
      teamBUnavailableDates: schema.team.unavailableDates,
      teamBIsFarAway: schema.team.isFarAway,
      category: schema.category.name,
    })
    .from(schema.matchup)
    .innerJoin(schema.team, eq(schema.matchup.teamBId, schema.team.id))
    .innerJoin(schema.category, eq(schema.team.categoryId, schema.category.id))
    .where(eq(schema.matchup.seasonId, seasonId));

  const teamBMap = new Map(teamBInfo.map((t) => [t.matchupId, t]));
  const pointRows = await db
    .select({
      matchupId: schema.points.matchupId,
      teamId: schema.points.teamId,
      set: schema.points.set,
      score: schema.points.points,
    })
    .from(schema.points)
    .where(eq(schema.points.seasonId, seasonId));

  const pointRowsByMatchup = pointRows.reduce((acc, row) => {
    const existing = acc.get(row.matchupId) ?? [];
    existing.push(row);
    acc.set(row.matchupId, existing);
    return acc;
  }, new Map<string, typeof pointRows>());

  return matchups.map((m) => {
    const teamB = teamBMap.get(m.id);
    const matchupPointRows = pointRowsByMatchup.get(m.id) ?? [];
    const bySet = new Map<
      number,
      { teamAScore: number | null; teamBScore: number | null }
    >();

    for (const row of matchupPointRows) {
      const setScore = bySet.get(row.set) ?? { teamAScore: null, teamBScore: null };
      if (row.teamId === m.teamAId) {
        setScore.teamAScore = row.score;
      }
      if (row.teamId === m.teamBId) {
        setScore.teamBScore = row.score;
      }
      bySet.set(row.set, setScore);
    }

    const sets = Array.from(bySet.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([set, score]) => ({
        set,
        teamAScore: score.teamAScore,
        teamBScore: score.teamBScore,
      }));

    const teamASetsWon = sets.reduce((acc, score) => {
      if (score.teamAScore === null || score.teamBScore === null) return acc;
      return score.teamAScore > score.teamBScore ? acc + 1 : acc;
    }, 0);
    const teamBSetsWon = sets.reduce((acc, score) => {
      if (score.teamAScore === null || score.teamBScore === null) return acc;
      return score.teamBScore > score.teamAScore ? acc + 1 : acc;
    }, 0);

    return {
      id: m.id,
      teamA: {
        id: m.teamAId,
        name: m.teamAName,
        logoUrl: m.teamALogo,
        unavailableDates: m.teamAUnavailableDates,
        isFarAway: Boolean(m.teamAIsFarAway),
      },
      teamB: {
        id: m.teamBId,
        name: teamB?.teamBName ?? "",
        logoUrl: teamB?.teamBLogo ?? "",
        unavailableDates: teamB?.teamBUnavailableDates ?? "",
        isFarAway: Boolean(teamB?.teamBIsFarAway),
      },
      category: teamB?.category ?? "",
      seasonId: m.seasonId,
      eventId: m.eventId,
      courtId: m.courtId,
      slotIndex: m.slotIndex,
      bestOf: m.bestOf,
      sets,
      teamASetsWon,
      teamBSetsWon,
      hasScores: sets.some(
        (score) => score.teamAScore !== null && score.teamBScore !== null,
      ),
    };
  });
}

export async function saveMatchupScorecard(
  db: Database,
  params: {
    seasonId: string;
    matchupId: string;
    bestOf: number;
    sets: Array<{
      set: number;
      teamAScore: number;
      teamBScore: number;
    }>;
  },
) {
  const [matchupRow] = await db
    .select({
      id: schema.matchup.id,
      seasonId: schema.matchup.seasonId,
      teamAId: schema.matchup.teamAId,
      teamBId: schema.matchup.teamBId,
    })
    .from(schema.matchup)
    .where(eq(schema.matchup.id, params.matchupId))
    .limit(1);

  if (!matchupRow || matchupRow.seasonId !== params.seasonId) {
    throw new Error("Matchup not found");
  }

  await db
    .update(schema.matchup)
    .set({ bestOf: params.bestOf })
    .where(eq(schema.matchup.id, params.matchupId));

  await db.delete(schema.points).where(eq(schema.points.matchupId, params.matchupId));

  if (params.sets.length === 0) {
    return;
  }

  const rows = params.sets.flatMap((setScore) => [
    {
      matchupId: params.matchupId,
      seasonId: params.seasonId,
      teamId: matchupRow.teamAId,
      set: setScore.set,
      points: setScore.teamAScore,
    },
    {
      matchupId: params.matchupId,
      seasonId: params.seasonId,
      teamId: matchupRow.teamBId,
      set: setScore.set,
      points: setScore.teamBScore,
    },
  ]);

  await db.insert(schema.points).values(rows);
}

export async function generateMatchupsForSeason(db: Database, seasonId: string) {
  // Get all teams for this season with their group assignments
  const teams = await db
    .select({
      id: schema.team.id,
      name: schema.team.name,
      logoUrl: schema.team.logoUrl,
      categoryId: schema.team.categoryId,
      category: schema.category.name,
      groupId: schema.seasonTeam.groupId,
    })
    .from(schema.team)
    .innerJoin(schema.seasonTeam, eq(schema.team.id, schema.seasonTeam.teamId))
    .innerJoin(schema.category, eq(schema.team.categoryId, schema.category.id))
    .where(eq(schema.seasonTeam.seasonId, seasonId));

  // Group teams by category and then by group
  // Teams without a group are grouped together per category
  const teamsByCategoryAndGroup = teams.reduce(
    (acc, team) => {
      if (!acc[team.category]) {
        acc[team.category] = {};
      }
      const groupKey = team.groupId ?? "__ungrouped__";
      if (!acc[team.category][groupKey]) {
        acc[team.category][groupKey] = [];
      }
      acc[team.category][groupKey].push(team);
      return acc;
    },
    {} as Record<string, Record<string, typeof teams>>,
  );

  // Generate round-robin matchups for each category-group combination
  const matchupsToInsert: {
    id: string;
    teamAId: string;
    teamBId: string;
    seasonId: string;
  }[] = [];

  for (const categoryGroups of Object.values(teamsByCategoryAndGroup)) {
    for (const groupTeams of Object.values(categoryGroups)) {
      // Only generate matchups if there are at least 2 teams in the group
      if (groupTeams.length < 2) continue;

      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          matchupsToInsert.push({
            id: uuidv4(),
            teamAId: groupTeams[i].id,
            teamBId: groupTeams[j].id,
            seasonId,
          });
        }
      }
    }
  }

  if (matchupsToInsert.length > 0) {
    await db.insert(schema.matchup).values(matchupsToInsert);
  }

  return matchupsToInsert.length;
}

export async function hasMatchupsForSeason(db: Database, seasonId: string) {
  const result = await db
    .select({ id: schema.matchup.id })
    .from(schema.matchup)
    .where(eq(schema.matchup.seasonId, seasonId))
    .limit(1);

  return result.length > 0;
}

export async function deleteMatchupsForSeason(db: Database, seasonId: string) {
  await db.delete(schema.matchup).where(eq(schema.matchup.seasonId, seasonId));
}

export async function clearMatchupPlacementsForSeason(db: Database, seasonId: string) {
  await db
    .update(schema.matchup)
    .set({
      eventId: null,
      courtId: null,
      slotIndex: null,
    })
    .where(eq(schema.matchup.seasonId, seasonId));
}

async function buildConstraintValidationContext(
  db: Database,
  params: {
    eventDates: Array<{ id: string; date: string }>;
    teamIds: string[];
  },
): Promise<ConstraintValidationContext> {
  if (params.teamIds.length === 0) {
    return {
      eventDateById: new Map(params.eventDates.map((event) => [event.id, event.date])),
      teamUnavailableDatesById: new Map(),
      maxGamesPerTeamId: new Map(),
    };
  }

  const teamRows = await db
    .select({
      id: schema.team.id,
      unavailableDates: schema.team.unavailableDates,
      isFarAway: schema.team.isFarAway,
    })
    .from(schema.team)
    .where(inArray(schema.team.id, params.teamIds));

  const teamUnavailableDatesById = new Map(
    teamRows.map((row) => [row.id, row.unavailableDates]),
  );
  const maxGamesPerTeamId = new Map(
    teamRows.map((row) => [
      row.id,
      row.isFarAway ? FAR_AWAY_MAX_GAMES_PER_EVENT : DEFAULT_MAX_GAMES_PER_EVENT,
    ]),
  );

  return {
    eventDateById: new Map(params.eventDates.map((event) => [event.id, event.date])),
    teamUnavailableDatesById,
    maxGamesPerTeamId,
  };
}

function buildCategoryBalanceContext(
  matchupOrder: Array<{ id: string }>,
  matchupCategoryById: Map<string, string | null>,
  orderedEventIds: string[],
): CategoryBalanceContext | null {
  if (orderedEventIds.length === 0) return null;

  const totalByCategoryId = new Map<string, number>();
  for (const matchup of matchupOrder) {
    const categoryId = matchupCategoryById.get(matchup.id);
    if (!categoryId) continue;
    totalByCategoryId.set(categoryId, (totalByCategoryId.get(categoryId) ?? 0) + 1);
  }

  const categoryIds = Array.from(totalByCategoryId.keys()).sort();
  if (categoryIds.length === 0) return null;

  const eventCategoryTargetByEventId = new Map<string, Map<string, number>>();
  for (const eventId of orderedEventIds) {
    const targetsByCategory = new Map<string, number>();
    for (const categoryId of categoryIds) {
      const totalForCategory = totalByCategoryId.get(categoryId) ?? 0;
      targetsByCategory.set(categoryId, totalForCategory / orderedEventIds.length);
    }
    eventCategoryTargetByEventId.set(eventId, targetsByCategory);
  }

  return {
    categoryIds,
    eventCategoryTargetByEventId,
  };
}

function applySwapToPlacements(
  placements: PlacementWithCategory[],
  swappedA: PlacementWithCategory,
  swappedB: PlacementWithCategory,
): PlacementWithCategory[] {
  return placements.map((placement) => {
    if (placement.id === swappedA.id) return swappedA;
    if (placement.id === swappedB.id) return swappedB;
    return placement;
  });
}

function getTotalCategoryDeviationFromTargets(
  placements: PlacementWithCategory[],
  categoryBalanceContext: CategoryBalanceContext | null,
): number {
  if (!categoryBalanceContext || categoryBalanceContext.categoryIds.length === 0) {
    return 0;
  }

  const countsByEventId = new Map<string, Map<string, number>>();
  for (const placement of placements) {
    if (!placement.categoryId) continue;
    const eventCounts = countsByEventId.get(placement.eventId) ?? new Map<string, number>();
    eventCounts.set(placement.categoryId, (eventCounts.get(placement.categoryId) ?? 0) + 1);
    countsByEventId.set(placement.eventId, eventCounts);
  }

  let totalDeviation = 0;
  for (const [eventId, targetsByCategory] of categoryBalanceContext.eventCategoryTargetByEventId) {
    const eventCounts = countsByEventId.get(eventId);
    for (const categoryId of categoryBalanceContext.categoryIds) {
      const count = eventCounts?.get(categoryId) ?? 0;
      const target = targetsByCategory.get(categoryId) ?? 0;
      totalDeviation += Math.abs(count - target);
    }
  }

  return totalDeviation;
}

function improveEventCategoryBalance(
  placements: PlacementWithCategory[],
  validationContext: ConstraintValidationContext,
  params: {
    orderedEventIds: string[];
    maxSlotIndex: number;
    totalMatchups: number;
    categoryBalanceContext: CategoryBalanceContext | null;
  },
): PlacementWithCategory[] {
  if (placements.length < 2 || !params.categoryBalanceContext) {
    return placements;
  }

  let improvedPlacements = [...placements];

  for (let pass = 0; pass < CATEGORY_BALANCE_MAX_PASSES; pass++) {
    const currentDeviation = getTotalCategoryDeviationFromTargets(
      improvedPlacements,
      params.categoryBalanceContext,
    );
    let improvementFound = false;
    let evaluations = 0;

    for (let i = 0; i < improvedPlacements.length; i++) {
      for (let j = i + 1; j < improvedPlacements.length; j++) {
        evaluations++;
        if (evaluations > MAX_SWAP_EVALUATIONS_PER_PASS) {
          break;
        }

        if (improvedPlacements[i]?.eventId === improvedPlacements[j]?.eventId) {
          continue;
        }

        const result = evaluatePlacementSwap(
          improvedPlacements[i],
          improvedPlacements[j],
          improvedPlacements,
          validationContext,
          {
            orderedEventIds: params.orderedEventIds,
            maxSlotIndex: params.maxSlotIndex,
            totalMatchups: params.totalMatchups,
            categoryBalanceContext: params.categoryBalanceContext,
          },
        );
        if (!result.valid) continue;

        const [swappedA, swappedB] = result.swappedPlacements;
        const placementsAfterSwap = applySwapToPlacements(improvedPlacements, swappedA, swappedB);
        const deviationAfter = getTotalCategoryDeviationFromTargets(
          placementsAfterSwap,
          params.categoryBalanceContext,
        );
        const deviationImprovement = currentDeviation - deviationAfter;
        if (deviationImprovement > 0) {
          improvedPlacements = placementsAfterSwap;
          improvementFound = true;
          break;
        }
      }
      if (improvementFound || evaluations > MAX_SWAP_EVALUATIONS_PER_PASS) {
        break;
      }
    }

    if (!improvementFound) {
      break;
    }
  }

  return improvedPlacements;
}

function improveFemenilNetChangeClustering(
  placements: PlacementWithCategory[],
  validationContext: ConstraintValidationContext,
  params: {
    orderedEventIds: string[];
    maxSlotIndex: number;
    totalMatchups: number;
    categoryBalanceContext: CategoryBalanceContext | null;
  },
): PlacementWithCategory[] {
  if (placements.length < 2) {
    return placements;
  }

  let improvedPlacements = [...placements];

  for (let pass = 0; pass < FEMENIL_CLUSTERING_MAX_PASSES; pass++) {
    const currentNetSwitches = getEstimatedFemenilNetSwitchCount(improvedPlacements);
    const currentDeviation = getTotalCategoryDeviationFromTargets(
      improvedPlacements,
      params.categoryBalanceContext,
    );
    let improvementFound = false;
    let evaluations = 0;

    for (let i = 0; i < improvedPlacements.length; i++) {
      for (let j = i + 1; j < improvedPlacements.length; j++) {
        evaluations++;
        if (evaluations > MAX_SWAP_EVALUATIONS_PER_PASS) {
          break;
        }

        const result = evaluatePlacementSwap(
          improvedPlacements[i],
          improvedPlacements[j],
          improvedPlacements,
          validationContext,
          {
            orderedEventIds: params.orderedEventIds,
            maxSlotIndex: params.maxSlotIndex,
            totalMatchups: params.totalMatchups,
            categoryBalanceContext: params.categoryBalanceContext,
          },
        );
        if (!result.valid) continue;

        const [swappedA, swappedB] = result.swappedPlacements;
        const placementsAfterSwap = applySwapToPlacements(improvedPlacements, swappedA, swappedB);
        const netSwitchesAfter = getEstimatedFemenilNetSwitchCount(placementsAfterSwap);
        const netSwitchImprovement = currentNetSwitches - netSwitchesAfter;
        if (netSwitchImprovement <= 0) continue;

        const deviationAfter = getTotalCategoryDeviationFromTargets(
          placementsAfterSwap,
          params.categoryBalanceContext,
        );
        if (deviationAfter > currentDeviation) continue;

        improvedPlacements = placementsAfterSwap;
        improvementFound = true;
        break;
      }
      if (improvementFound || evaluations > MAX_SWAP_EVALUATIONS_PER_PASS) {
        break;
      }
    }

    if (!improvementFound) {
      break;
    }
  }

  return improvedPlacements;
}

function improveByGeneralSwaps(
  placements: PlacementWithCategory[],
  validationContext: ConstraintValidationContext,
  params: {
    orderedEventIds: string[];
    maxSlotIndex: number;
    totalMatchups: number;
    categoryBalanceContext: CategoryBalanceContext | null;
  },
): PlacementWithCategory[] {
  if (placements.length < 2) {
    return placements;
  }

  let improvedPlacements = [...placements];

  for (let pass = 0; pass < GENERAL_SWAP_MAX_PASSES; pass++) {
    let improvementFound = false;
    let evaluations = 0;

    for (let i = 0; i < improvedPlacements.length; i++) {
      for (let j = i + 1; j < improvedPlacements.length; j++) {
        evaluations++;
        if (evaluations > MAX_SWAP_EVALUATIONS_PER_PASS) {
          break;
        }

        const result = evaluatePlacementSwap(
          improvedPlacements[i],
          improvedPlacements[j],
          improvedPlacements,
          validationContext,
          {
            orderedEventIds: params.orderedEventIds,
            maxSlotIndex: params.maxSlotIndex,
            totalMatchups: params.totalMatchups,
            categoryBalanceContext: params.categoryBalanceContext,
          },
        );

        if (result.valid && result.scoreImprovement > 0) {
          const [swappedA, swappedB] = result.swappedPlacements;
          improvedPlacements = applySwapToPlacements(improvedPlacements, swappedA, swappedB);
          improvementFound = true;
          break;
        }
      }
      if (improvementFound || evaluations > MAX_SWAP_EVALUATIONS_PER_PASS) break;
    }

    if (!improvementFound) break;
  }

  return improvedPlacements;
}

function buildSchedulingMetrics(
  placements: PlacementWithCategory[],
  params: {
    orderedEventIds: string[];
    maxSlotIndex: number;
    totalMatchups: number;
    categoryBalanceContext: CategoryBalanceContext | null;
  },
) {
  const categoryCountsByEventId: Record<string, Record<string, number>> = {};
  for (const eventId of params.orderedEventIds) {
    categoryCountsByEventId[eventId] = {};
  }
  for (const placement of placements) {
    if (!placement.categoryId) continue;
    if (!categoryCountsByEventId[placement.eventId]) {
      categoryCountsByEventId[placement.eventId] = {};
    }
    const existing = categoryCountsByEventId[placement.eventId][placement.categoryId] ?? 0;
    categoryCountsByEventId[placement.eventId][placement.categoryId] = existing + 1;
  }

  return {
    categoryCountsByEventId,
    totalCategoryDeviation: getTotalCategoryDeviationFromTargets(
      placements,
      params.categoryBalanceContext,
    ),
    estimatedFemenilNetSwitches: getEstimatedFemenilNetSwitchCount(placements),
    qualityScore: getScheduleQualityScore({
      placementsWithCategory: placements,
      orderedEventIds: params.orderedEventIds,
      maxSlotIndex: params.maxSlotIndex,
      totalMatchups: params.totalMatchups,
      categoryBalanceContext: params.categoryBalanceContext,
    }),
  };
}

/**
 * Auto-schedule matchups across events and courts
 * Distributes matchups evenly across events, alternating between courts A and B
 */
export async function autoScheduleMatchups(
  db: Database,
  seasonId: string,
  eventIds: string[],
  gamesPerEvening: number,
) {
  const allSeasonMatchups = await db
    .select({
      id: schema.matchup.id,
      teamAId: schema.matchup.teamAId,
      teamBId: schema.matchup.teamBId,
      eventId: schema.matchup.eventId,
      courtId: schema.matchup.courtId,
      slotIndex: schema.matchup.slotIndex,
    })
    .from(schema.matchup)
    .where(eq(schema.matchup.seasonId, seasonId));

  const candidateMatchups = allSeasonMatchups.map((matchup) => ({
    id: matchup.id,
    teamAId: matchup.teamAId,
    teamBId: matchup.teamBId,
  }));

  if (candidateMatchups.length === 0 || eventIds.length === 0) {
    return { scheduledCount: 0, unscheduledCount: candidateMatchups.length };
  }

  const courts: ("A" | "B")[] = ["A", "B"];
  const events = await db
    .select({
      id: schema.scheduleEvent.id,
      date: schema.scheduleEvent.startTime,
    })
    .from(schema.scheduleEvent)
    .where(eq(schema.scheduleEvent.seasonId, seasonId));

  const eventDates = events.filter((event) => eventIds.includes(event.id));
  const orderedEventIds = eventDates
    .slice()
    .sort((a, b) => normalizeDateOnly(a.date).localeCompare(normalizeDateOnly(b.date)))
    .map((event) => event.id);
  const teamIds = Array.from(
    new Set(allSeasonMatchups.flatMap((matchup) => [matchup.teamAId, matchup.teamBId])),
  );
  const validationContext = await buildConstraintValidationContext(db, {
    eventDates: events,
    teamIds,
  });

  // Build matchup category map (both teams in a matchup have same category)
  const teamRows = await db
    .select({
      id: schema.team.id,
      categoryId: schema.team.categoryId,
    })
    .from(schema.team)
    .where(inArray(schema.team.id, teamIds));
  const teamCategoryById = new Map(teamRows.map((r) => [r.id, r.categoryId]));
  const matchupCategoryById = new Map(
    allSeasonMatchups.map((m) => [
      m.id,
      teamCategoryById.get(m.teamAId) ?? teamCategoryById.get(m.teamBId) ?? null,
    ]),
  );

  const categoryBalanceContext = buildCategoryBalanceContext(
    candidateMatchups,
    matchupCategoryById,
    orderedEventIds,
  );
  const maxSlotIndex = gamesPerEvening - 1;
  const runInitialPlacementPass = (
    matchupOrder: typeof candidateMatchups,
  ): PlacementWithCategory[] => {
    const acceptedPlacements: ScheduledMatchupPlacement[] = [];
    const acceptedPlacementsWithCategory: PlacementWithCategory[] = [];
    const acceptedMatchupIds = new Set<string>();

    for (let slotIndex = 0; slotIndex < gamesPerEvening; slotIndex++) {
      for (const courtId of courts) {
        for (const eventId of orderedEventIds) {
          let selectedPlacement: ScheduledMatchupPlacement | null = null;
          let selectedPlacementScore = Number.POSITIVE_INFINITY;

          for (const matchup of matchupOrder) {
            if (acceptedMatchupIds.has(matchup.id)) {
              continue;
            }

            const candidatePlacement: ScheduledMatchupPlacement = {
              id: matchup.id,
              teamAId: matchup.teamAId,
              teamBId: matchup.teamBId,
              eventId,
              courtId: courtId as "A" | "B",
              slotIndex,
            };

            const violationReason = getPlacementViolationReason(
              candidatePlacement,
              acceptedPlacements,
              validationContext,
            );
            if (!violationReason) {
              const categoryId = matchupCategoryById.get(matchup.id) ?? null;
              const preferenceScore = getPlacementPreferenceScore({
                placement: candidatePlacement,
                categoryId,
                existingPlacements: acceptedPlacements,
                existingPlacementsWithCategory: acceptedPlacementsWithCategory,
                orderedEventIds,
                maxSlotIndex,
                totalMatchups: matchupOrder.length,
                categoryBalanceContext,
              });
              if (preferenceScore < selectedPlacementScore) {
                selectedPlacementScore = preferenceScore;
                selectedPlacement = candidatePlacement;
              }
              if (selectedPlacementScore === 0) {
                break;
              }
            }
          }

          if (!selectedPlacement) {
            continue;
          }

          acceptedPlacements.push(selectedPlacement);
          acceptedPlacementsWithCategory.push({
            ...selectedPlacement,
            categoryId: matchupCategoryById.get(selectedPlacement.id) ?? null,
          });
          acceptedMatchupIds.add(selectedPlacement.id);
        }
      }
    }
    return acceptedPlacementsWithCategory;
  };
  const improvementParams = {
    orderedEventIds,
    maxSlotIndex,
    totalMatchups: candidateMatchups.length,
    categoryBalanceContext,
  };
  let finalPlacements = runInitialPlacementPass(candidateMatchups);
  finalPlacements = improveEventCategoryBalance(
    finalPlacements,
    validationContext,
    improvementParams,
  );
  finalPlacements = improveFemenilNetChangeClustering(
    finalPlacements,
    validationContext,
    improvementParams,
  );
  finalPlacements = improveByGeneralSwaps(finalPlacements, validationContext, improvementParams);
  const schedulingMetrics = buildSchedulingMetrics(finalPlacements, improvementParams);
  const scheduledCount = finalPlacements.length;

  // Always rebuild from scratch: clear current placements first.
  await db
    .update(schema.matchup)
    .set({
      eventId: null,
      courtId: null,
      slotIndex: null,
    })
    .where(eq(schema.matchup.seasonId, seasonId));

  for (const placement of finalPlacements) {
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
    scheduledCount,
    unscheduledCount: candidateMatchups.length - scheduledCount,
    metrics: schedulingMetrics,
  };
}

// ============== Bulk Save ==============

type ScheduleData = {
  seasonId: string;
  events: { id: string; name: string; date: string }[];
  matchups: {
    id: string;
    eventId: string | null;
    courtId: string | null;
    slotIndex: number | null;
  }[];
};

export async function saveSchedule(db: Database, data: ScheduleData) {
  const { seasonId, events, matchups } = data;

  const matchupRows = await db
    .select({
      id: schema.matchup.id,
      teamAId: schema.matchup.teamAId,
      teamBId: schema.matchup.teamBId,
    })
    .from(schema.matchup)
    .where(eq(schema.matchup.seasonId, seasonId));
  const matchupById = new Map(matchupRows.map((matchup) => [matchup.id, matchup]));
  const scheduledPlacements = matchups.flatMap((matchup) => {
    const matchupTeams = matchupById.get(matchup.id);
    if (
      !matchupTeams ||
      matchup.eventId === null ||
      matchup.courtId === null ||
      matchup.slotIndex === null
    ) {
      return [];
    }

    return [
      {
        id: matchup.id,
        teamAId: matchupTeams.teamAId,
        teamBId: matchupTeams.teamBId,
        eventId: matchup.eventId,
        courtId: matchup.courtId as "A" | "B",
        slotIndex: matchup.slotIndex,
      } satisfies ScheduledMatchupPlacement,
    ];
  });
  const teamIds = Array.from(
    new Set(matchupRows.flatMap((matchup) => [matchup.teamAId, matchup.teamBId])),
  );
  const validationContext = await buildConstraintValidationContext(db, {
    eventDates: events.map((event) => ({ id: event.id, date: event.date })),
    teamIds,
  });
  const acceptedPlacements: ScheduledMatchupPlacement[] = [];
  for (const placement of scheduledPlacements) {
    const violationReason = getPlacementViolationReason(
      placement,
      acceptedPlacements,
      validationContext,
    );
    if (violationReason) {
      throw new Error(violationReason);
    }
    acceptedPlacements.push(placement);
  }

  // Get existing events for this season
  const existingEvents = await getEventsBySeasonId(db, seasonId);
  const existingEventIds = new Set(existingEvents.map((e) => e.id));
  const newEventIds = new Set(events.map((e) => e.id));

  // Delete events that no longer exist
  for (const existingEvent of existingEvents) {
    if (!newEventIds.has(existingEvent.id)) {
      await deleteEvent(db, existingEvent.id);
    }
  }

  // Insert or update events
  for (const event of events) {
    if (existingEventIds.has(event.id)) {
      await updateEvent(db, event.id, { name: event.name, date: event.date });
    } else {
      await db.insert(schema.scheduleEvent).values({
        id: event.id,
        name: event.name,
        startTime: event.date,
        seasonId,
      });
    }
  }

  // Update matchup scheduling info
  for (const matchup of matchups) {
    await db
      .update(schema.matchup)
      .set({
        eventId: matchup.eventId,
        courtId: matchup.courtId,
        slotIndex: matchup.slotIndex,
      })
      .where(eq(schema.matchup.id, matchup.id));
  }
}

// ============== Configure Groups & Generate Matchups ==============

type GroupConfig = {
  categoryId: string;
  groups: Array<{
    name: string;
    teamIds: string[];
  }>;
};

/**
 * One-shot function to configure groups and generate matchups
 * 1. Deletes existing groups and matchups for the season
 * 2. Creates new groups with team assignments
 * 3. Generates round-robin matchups per group
 */
export async function configureGroupsAndGenerateMatchups(
  db: Database,
  seasonId: string,
  categoryConfigs: GroupConfig[],
) {
  // Delete existing matchups for this season
  await db.delete(schema.matchup).where(eq(schema.matchup.seasonId, seasonId));

  // Delete existing groups for this season
  await db.delete(schema.group).where(eq(schema.group.seasonId, seasonId));

  // Clear all team group assignments for this season
  await db
    .update(schema.seasonTeam)
    .set({ groupId: null })
    .where(eq(schema.seasonTeam.seasonId, seasonId));

  // Create groups and assign teams
  const matchupsToInsert: Array<{
    id: string;
    teamAId: string;
    teamBId: string;
    seasonId: string;
  }> = [];

  for (const categoryConfig of categoryConfigs) {
    for (const groupConfig of categoryConfig.groups) {
      // Create the group
      const groupId = uuidv4();
      await db.insert(schema.group).values({
        id: groupId,
        name: groupConfig.name,
        seasonId,
        categoryId: categoryConfig.categoryId,
      });

      // Assign teams to this group
      for (const teamId of groupConfig.teamIds) {
        await db
          .update(schema.seasonTeam)
          .set({ groupId })
          .where(
            and(
              eq(schema.seasonTeam.seasonId, seasonId),
              eq(schema.seasonTeam.teamId, teamId),
            ),
          );
      }

      // Generate round-robin matchups for this group
      const teamIds = groupConfig.teamIds;
      if (teamIds.length >= 2) {
        for (let i = 0; i < teamIds.length; i++) {
          for (let j = i + 1; j < teamIds.length; j++) {
            matchupsToInsert.push({
              id: uuidv4(),
              teamAId: teamIds[i],
              teamBId: teamIds[j],
              seasonId,
            });
          }
        }
      }
    }
  }

  // Bulk insert matchups
  if (matchupsToInsert.length > 0) {
    await db.insert(schema.matchup).values(matchupsToInsert);
  }

  return { matchupsGenerated: matchupsToInsert.length };
}

// ============== Public Schedule ==============

export type PublicMatchup = {
  id: string;
  teamA: { name: string; logoUrl: string };
  teamB: { name: string; logoUrl: string };
  category: string;
  courtId: string | null;
  slotIndex: number | null;
};

export type PublicScheduleEvent = {
  id: string;
  name: string;
  date: string;
  matchups: PublicMatchup[];
};

export type EventWithMatchups = {
  id: string;
  name: string;
  date: string;
  season: {
    id: string;
    name: string;
  };
  matchups: PublicMatchup[];
};

/**
 * Get public schedule for a season - upcoming events with their matchups
 */
export async function getPublicSchedule(
  db: Database,
  seasonId: string,
  options?: { upcomingOnly?: boolean; limit?: number },
) {
  const { upcomingOnly = false, limit } = options ?? {};

  // Build the query conditions
  const conditions = [eq(schema.scheduleEvent.seasonId, seasonId)];

  if (upcomingOnly) {
    const today = new Date().toISOString().split("T")[0];
    conditions.push(gte(schema.scheduleEvent.startTime, today));
  }

  // Get events
  const eventsQuery = db
    .select({
      id: schema.scheduleEvent.id,
      name: schema.scheduleEvent.name,
      date: schema.scheduleEvent.startTime,
    })
    .from(schema.scheduleEvent)
    .where(and(...conditions))
    .orderBy(asc(schema.scheduleEvent.startTime));

  const events = limit ? await eventsQuery.limit(limit) : await eventsQuery;

  if (events.length === 0) return [];

  // Get all matchups for these events
  const eventIds = events.map((e) => e.id);
  const matchups = await getMatchupsBySeasonId(db, seasonId);

  // Filter to only scheduled matchups for these events
  const scheduledMatchups = matchups.filter(
    (m) => m.eventId && eventIds.includes(m.eventId),
  );

  // Group matchups by event
  const matchupsByEvent = new Map<string, typeof scheduledMatchups>();
  for (const matchup of scheduledMatchups) {
    if (matchup.eventId) {
      const existing = matchupsByEvent.get(matchup.eventId) ?? [];
      existing.push(matchup);
      matchupsByEvent.set(matchup.eventId, existing);
    }
  }

  // Build the result with matchups grouped by event, sorted by slot
  return events.map((event) => {
    const eventMatchups = matchupsByEvent.get(event.id) ?? [];
    // Sort by slot index
    eventMatchups.sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));

    return {
      ...event,
      matchups: eventMatchups.map((m) => ({
        id: m.id,
        teamA: { name: m.teamA.name, logoUrl: m.teamA.logoUrl },
        teamB: { name: m.teamB.name, logoUrl: m.teamB.logoUrl },
        category: m.category,
        courtId: m.courtId,
        slotIndex: m.slotIndex,
      })),
    };
  });
}

/**
 * Get a single event with all scheduled matchups for PDF/details views.
 */
export async function getEventWithMatchupsById(db: Database, eventId: string) {
  const [event] = await db
    .select({
      id: schema.scheduleEvent.id,
      name: schema.scheduleEvent.name,
      date: schema.scheduleEvent.startTime,
      seasonId: schema.scheduleEvent.seasonId,
      seasonName: schema.season.name,
    })
    .from(schema.scheduleEvent)
    .innerJoin(schema.season, eq(schema.scheduleEvent.seasonId, schema.season.id))
    .where(eq(schema.scheduleEvent.id, eventId))
    .limit(1);

  if (!event) {
    return null;
  }

  const seasonMatchups = await getMatchupsBySeasonId(db, event.seasonId);
  const eventMatchups = seasonMatchups
    .filter((matchup) => matchup.eventId === eventId)
    .sort((a, b) => {
      const slotCompare = (a.slotIndex ?? 999) - (b.slotIndex ?? 999);
      if (slotCompare !== 0) return slotCompare;
      return (a.courtId ?? "Z").localeCompare(b.courtId ?? "Z");
    });

  return {
    id: event.id,
    name: event.name,
    date: event.date,
    season: {
      id: event.seasonId,
      name: event.seasonName,
    },
    matchups: eventMatchups.map((matchup) => ({
      id: matchup.id,
      teamA: { name: matchup.teamA.name, logoUrl: matchup.teamA.logoUrl },
      teamB: { name: matchup.teamB.name, logoUrl: matchup.teamB.logoUrl },
      category: matchup.category,
      courtId: matchup.courtId,
      slotIndex: matchup.slotIndex,
    })),
  } satisfies EventWithMatchups;
}
