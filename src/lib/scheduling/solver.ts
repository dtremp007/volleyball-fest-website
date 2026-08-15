/**
 * Pure schedule solver — greedy placement plus three first-improvement swap
 * passes. No database access; all inputs are loaded by the caller.
 */

import {
  evaluatePlacementSwap,
  getEstimatedFemenilNetSwitchCount,
  getPlacementPreferenceScore,
  getPlacementViolationReason,
  getScheduleQualityScore,
  type CategoryBalanceContext,
  type ConstraintValidationContext,
  type PlacementWithCategory,
  type ScheduledMatchupPlacement,
} from "~/lib/db/queries/schedule-algorithm";
import type { SchedulingWeights } from "~/validators/scheduling.validators";

const CATEGORY_BALANCE_MAX_PASSES = 6;
const FEMENIL_CLUSTERING_MAX_PASSES = 6;
const GENERAL_SWAP_MAX_PASSES = 15;
const MAX_SWAP_EVALUATIONS_PER_PASS = 1200;

const COURTS: ("A" | "B")[] = ["A", "B"];

/** mulberry32 — deterministic 32-bit RNG for seeded candidate runs. */
function createSeededRng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace<T>(items: T[], random: () => number) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const current = items[i];
    const swap = items[j];
    if (current === undefined || swap === undefined) continue;
    items[i] = swap;
    items[j] = current;
  }
}

export type SolveScheduleMatchup = {
  id: string;
  teamAId: string;
  teamBId: string;
  categoryId: string | null;
};

export type SolveScheduleInput = {
  matchups: SolveScheduleMatchup[];
  orderedEventIds: string[];
  gamesPerEvening: number;
  validationContext: ConstraintValidationContext;
  weights: SchedulingWeights;
  /** When set, shuffles matchup order within far-away/local groups so candidate runs can differ. Omitted for identical regenerate. */
  seed?: number;
};

export type SchedulingMetrics = {
  qualityScore: number;
  totalCategoryDeviation: number;
  estimatedFemenilNetSwitches: number;
  categoryCountsByEventId: Record<string, Record<string, number>>;
  /** Mean of (max − min) games-per-event counts per team, across events that team appeared in. 0 if no team played. */
  gamesPerEventSpread: number;
  /** Fraction of far-away teams present in the input matchups that had at least one event with exactly 2 games. 0 if none. */
  farAwayTwoGamesHitRate: number;
  unscheduledCount: number;
  scheduledCount: number;
};

export type SolveScheduleResult = {
  placements: PlacementWithCategory[];
  metrics: SchedulingMetrics;
  unscheduledMatchupIds: string[];
};

type ImprovementParams = {
  orderedEventIds: string[];
  maxSlotIndex: number;
  totalMatchups: number;
  categoryBalanceContext: CategoryBalanceContext | null;
  farAwayTeamIds: Set<string>;
  weights: SchedulingWeights;
};

function buildCategoryBalanceContext(
  matchups: SolveScheduleMatchup[],
  orderedEventIds: string[],
): CategoryBalanceContext | null {
  if (orderedEventIds.length === 0) return null;

  const totalByCategoryId = new Map<string, number>();
  for (const matchup of matchups) {
    const categoryId = matchup.categoryId;
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
    const eventCounts =
      countsByEventId.get(placement.eventId) ?? new Map<string, number>();
    eventCounts.set(
      placement.categoryId,
      (eventCounts.get(placement.categoryId) ?? 0) + 1,
    );
    countsByEventId.set(placement.eventId, eventCounts);
  }

  let totalDeviation = 0;
  for (const [
    eventId,
    targetsByCategory,
  ] of categoryBalanceContext.eventCategoryTargetByEventId) {
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
  params: ImprovementParams,
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
          params,
        );
        if (!result.valid) continue;

        const [swappedA, swappedB] = result.swappedPlacements;
        const placementsAfterSwap = applySwapToPlacements(
          improvedPlacements,
          swappedA,
          swappedB,
        );
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
  params: ImprovementParams,
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
          params,
        );
        if (!result.valid) continue;

        const [swappedA, swappedB] = result.swappedPlacements;
        const placementsAfterSwap = applySwapToPlacements(
          improvedPlacements,
          swappedA,
          swappedB,
        );
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
  params: ImprovementParams,
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
          params,
        );

        if (result.valid && result.scoreImprovement > 0) {
          const [swappedA, swappedB] = result.swappedPlacements;
          improvedPlacements = applySwapToPlacements(
            improvedPlacements,
            swappedA,
            swappedB,
          );
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

function getGamesByTeamAndEvent(placements: PlacementWithCategory[]) {
  const gamesByTeamAndEvent = new Map<string, Map<string, number>>();
  for (const placement of placements) {
    for (const teamId of [placement.teamAId, placement.teamBId]) {
      const byEvent = gamesByTeamAndEvent.get(teamId) ?? new Map<string, number>();
      byEvent.set(placement.eventId, (byEvent.get(placement.eventId) ?? 0) + 1);
      gamesByTeamAndEvent.set(teamId, byEvent);
    }
  }
  return gamesByTeamAndEvent;
}

/** Mean of (max − min) games-per-event counts per team, across events that team appeared in. */
function getGamesPerEventSpread(placements: PlacementWithCategory[]): number {
  const gamesByTeamAndEvent = getGamesByTeamAndEvent(placements);
  if (gamesByTeamAndEvent.size === 0) return 0;

  let totalRange = 0;
  for (const byEvent of gamesByTeamAndEvent.values()) {
    const counts = Array.from(byEvent.values());
    totalRange += Math.max(...counts) - Math.min(...counts);
  }
  return totalRange / gamesByTeamAndEvent.size;
}

/** Fraction of far-away teams in the input matchups with at least one event of exactly 2 games. */
function getFarAwayTwoGamesHitRate(
  placements: PlacementWithCategory[],
  matchups: SolveScheduleMatchup[],
  farAwayTeamIds: Set<string>,
): number {
  const farAwayInMatchups = new Set<string>();
  for (const matchup of matchups) {
    if (farAwayTeamIds.has(matchup.teamAId)) farAwayInMatchups.add(matchup.teamAId);
    if (farAwayTeamIds.has(matchup.teamBId)) farAwayInMatchups.add(matchup.teamBId);
  }
  if (farAwayInMatchups.size === 0) return 0;

  const gamesByTeamAndEvent = getGamesByTeamAndEvent(placements);
  let hits = 0;
  for (const teamId of farAwayInMatchups) {
    const byEvent = gamesByTeamAndEvent.get(teamId);
    if (!byEvent) continue;
    if (Array.from(byEvent.values()).some((count) => count === 2)) {
      hits += 1;
    }
  }
  return hits / farAwayInMatchups.size;
}

function buildSchedulingMetrics(
  placements: PlacementWithCategory[],
  matchups: SolveScheduleMatchup[],
  params: ImprovementParams,
): SchedulingMetrics {
  const categoryCountsByEventId: Record<string, Record<string, number>> = {};
  for (const eventId of params.orderedEventIds) {
    categoryCountsByEventId[eventId] = {};
  }
  for (const placement of placements) {
    if (!placement.categoryId) continue;
    if (!categoryCountsByEventId[placement.eventId]) {
      categoryCountsByEventId[placement.eventId] = {};
    }
    const existing =
      categoryCountsByEventId[placement.eventId][placement.categoryId] ?? 0;
    categoryCountsByEventId[placement.eventId][placement.categoryId] = existing + 1;
  }

  const scheduledCount = placements.length;
  const unscheduledCount = matchups.length - scheduledCount;

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
      farAwayTeamIds: params.farAwayTeamIds,
      weights: params.weights,
    }),
    gamesPerEventSpread: getGamesPerEventSpread(placements),
    farAwayTwoGamesHitRate: getFarAwayTwoGamesHitRate(
      placements,
      matchups,
      params.farAwayTeamIds,
    ),
    scheduledCount,
    unscheduledCount,
  };
}

function runInitialPlacementPass(
  matchupOrder: SolveScheduleMatchup[],
  params: {
    gamesPerEvening: number;
    orderedEventIds: string[];
    validationContext: ConstraintValidationContext;
    categoryBalanceContext: CategoryBalanceContext | null;
    farAwayTeamIds: Set<string>;
    weights: SchedulingWeights;
    maxSlotIndex: number;
  },
): PlacementWithCategory[] {
  const acceptedPlacements: ScheduledMatchupPlacement[] = [];
  const acceptedPlacementsWithCategory: PlacementWithCategory[] = [];
  const acceptedMatchupIds = new Set<string>();
  const matchupCategoryById = new Map(
    matchupOrder.map((matchup) => [matchup.id, matchup.categoryId]),
  );

  for (let slotIndex = 0; slotIndex < params.gamesPerEvening; slotIndex++) {
    for (const courtId of COURTS) {
      for (const eventId of params.orderedEventIds) {
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
            courtId,
            slotIndex,
          };

          const violationReason = getPlacementViolationReason(
            candidatePlacement,
            acceptedPlacements,
            params.validationContext,
          );
          if (!violationReason) {
            const categoryId = matchupCategoryById.get(matchup.id) ?? null;
            const preferenceScore = getPlacementPreferenceScore({
              placement: candidatePlacement,
              categoryId,
              existingPlacements: acceptedPlacements,
              existingPlacementsWithCategory: acceptedPlacementsWithCategory,
              orderedEventIds: params.orderedEventIds,
              maxSlotIndex: params.maxSlotIndex,
              totalMatchups: matchupOrder.length,
              categoryBalanceContext: params.categoryBalanceContext,
              farAwayTeamIds: params.farAwayTeamIds,
              weights: params.weights,
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
}

export function solveSchedule(input: SolveScheduleInput): SolveScheduleResult {
  const {
    matchups,
    orderedEventIds,
    gamesPerEvening,
    validationContext,
    weights,
    seed,
  } = input;

  if (matchups.length === 0 || orderedEventIds.length === 0 || gamesPerEvening <= 0) {
    return {
      placements: [],
      unscheduledMatchupIds: matchups.map((matchup) => matchup.id),
      metrics: {
        qualityScore: 0,
        totalCategoryDeviation: 0,
        estimatedFemenilNetSwitches: 0,
        categoryCountsByEventId: Object.fromEntries(
          orderedEventIds.map((eventId) => [eventId, {}]),
        ),
        gamesPerEventSpread: 0,
        farAwayTwoGamesHitRate: getFarAwayTwoGamesHitRate(
          [],
          matchups,
          validationContext.farAwayTeamIds,
        ),
        unscheduledCount: matchups.length,
        scheduledCount: 0,
      },
    };
  }

  const categoryBalanceContext = buildCategoryBalanceContext(matchups, orderedEventIds);
  const maxSlotIndex = gamesPerEvening - 1;
  const { farAwayTeamIds } = validationContext;
  const improvementParams: ImprovementParams = {
    orderedEventIds,
    maxSlotIndex,
    totalMatchups: matchups.length,
    categoryBalanceContext,
    farAwayTeamIds,
    weights,
  };

  const sortedMatchups = [...matchups].sort((a, b) => {
    const aHasFarAway =
      farAwayTeamIds.has(a.teamAId) || farAwayTeamIds.has(a.teamBId) ? 0 : 1;
    const bHasFarAway =
      farAwayTeamIds.has(b.teamAId) || farAwayTeamIds.has(b.teamBId) ? 0 : 1;
    return aHasFarAway - bHasFarAway;
  });

  // Seed only shuffles within far-away / local groups so regenerate without a
  // seed stays identical, while candidate runs can break greedy ties.
  if (seed !== undefined) {
    const random = createSeededRng(seed);
    const farAway = sortedMatchups.filter(
      (matchup) =>
        farAwayTeamIds.has(matchup.teamAId) || farAwayTeamIds.has(matchup.teamBId),
    );
    const local = sortedMatchups.filter(
      (matchup) =>
        !farAwayTeamIds.has(matchup.teamAId) && !farAwayTeamIds.has(matchup.teamBId),
    );
    shuffleInPlace(farAway, random);
    shuffleInPlace(local, random);
    sortedMatchups.splice(0, sortedMatchups.length, ...farAway, ...local);
  }

  let finalPlacements = runInitialPlacementPass(sortedMatchups, {
    gamesPerEvening,
    orderedEventIds,
    validationContext,
    categoryBalanceContext,
    farAwayTeamIds,
    weights,
    maxSlotIndex,
  });
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
  finalPlacements = improveByGeneralSwaps(
    finalPlacements,
    validationContext,
    improvementParams,
  );

  const scheduledIds = new Set(finalPlacements.map((placement) => placement.id));
  const unscheduledMatchupIds = matchups
    .filter((matchup) => !scheduledIds.has(matchup.id))
    .map((matchup) => matchup.id);

  return {
    placements: finalPlacements,
    metrics: buildSchedulingMetrics(finalPlacements, matchups, improvementParams),
    unscheduledMatchupIds,
  };
}
