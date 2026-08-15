/**
 * Pure schedule solver — greedy placement plus seeded simulated annealing.
 * Moves are evaluated with delta scoring (affected events only). No database access.
 */

import {
  buildCategoryRankById,
  countHardConflicts,
  getCourtCategorySwitchCount,
  getPlacementPreferenceScore,
  getPlacementViolationReason,
  getScheduleQualityScore,
  type CategoryBalanceContext,
  type ConstraintValidationContext,
  type PlacementWithCategory,
  type ScheduledMatchupPlacement,
} from "~/lib/db/queries/schedule-algorithm";
import type { SchedulingWeights } from "~/validators/scheduling.validators";

const COURTS: ("A" | "B")[] = ["A", "B"];

const DEFAULT_ANNEALING_SEED = 1;
const DEFAULT_INITIAL_TEMPERATURE = 30;
const MIN_TEMPERATURE = 0.05;
const COOLING_RATE = 0.995;
const TEMPERATURE_SAMPLE_MOVES = 16;
const MAX_PROPOSAL_ATTEMPTS_PER_STEP = 24;

export type SolverEffort = "greedy" | "low" | "medium" | "high";

const EFFORT_LIMITS: Record<
  Exclude<SolverEffort, "greedy">,
  { maxIterations: number; timeBudgetMs: number }
> = {
  low: { maxIterations: 120, timeBudgetMs: 250 },
  medium: { maxIterations: 400, timeBudgetMs: 1000 },
  high: { maxIterations: 2000, timeBudgetMs: 2500 },
};

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
  /** Categories ordered earliest-to-latest for time-of-night preference. */
  orderedCategoryIds: string[];
  gamesPerEvening: number;
  validationContext: ConstraintValidationContext;
  weights: SchedulingWeights;
  /** When set, shuffles matchup order within far-away/local groups so candidate runs can differ. Omitted for identical regenerate. */
  seed?: number;
  /**
   * Search effort after greedy placement. Defaults to `"medium"`.
   * `"greedy"` skips annealing (placement only).
   */
  effort?: SolverEffort;
};

export type SchedulingMetrics = {
  qualityScore: number;
  totalCategoryDeviation: number;
  courtCategorySwitches: number;
  hardConflictCount: number;
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

export type SolverMove =
  | { type: "swap"; placementIdA: string; placementIdB: string }
  | {
      type: "relocate";
      placementId: string;
      eventId: string;
      courtId: "A" | "B";
      slotIndex: number;
    }
  | { type: "pool-swap"; scheduledId: string; unscheduledId: string };

export type EvaluateMoveResult = {
  valid: boolean;
  scoreDelta: number;
  nextPlacements: PlacementWithCategory[];
  nextUnscheduled: string[];
};

type SolverScoreParams = {
  orderedEventIds: string[];
  maxSlotIndex: number;
  totalMatchups: number;
  categoryBalanceContext: CategoryBalanceContext | null;
  farAwayTeamIds: Set<string>;
  categoryRankById: Map<string, number>;
  weights: SchedulingWeights;
};

type EmptySlot = {
  eventId: string;
  courtId: "A" | "B";
  slotIndex: number;
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
  params: SolverScoreParams,
  validationContext: ConstraintValidationContext,
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
    courtCategorySwitches: getCourtCategorySwitchCount(placements),
    hardConflictCount: countHardConflicts(placements, validationContext),
    qualityScore: getScheduleQualityScore({
      placementsWithCategory: placements,
      orderedEventIds: params.orderedEventIds,
      maxSlotIndex: params.maxSlotIndex,
      totalMatchups: params.totalMatchups,
      categoryBalanceContext: params.categoryBalanceContext,
      farAwayTeamIds: params.farAwayTeamIds,
      categoryRankById: params.categoryRankById,
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
    categoryRankById: Map<string, number>;
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
              categoryRankById: params.categoryRankById,
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

function slotKey(eventId: string, courtId: string, slotIndex: number) {
  return `${eventId}:${courtId}:${slotIndex}`;
}

function listEmptySlots(
  orderedEventIds: string[],
  gamesPerEvening: number,
  placements: PlacementWithCategory[],
): EmptySlot[] {
  const occupied = new Set(
    placements.map((placement) =>
      slotKey(placement.eventId, placement.courtId, placement.slotIndex),
    ),
  );
  const empty: EmptySlot[] = [];
  for (const eventId of orderedEventIds) {
    for (const courtId of COURTS) {
      for (let slotIndex = 0; slotIndex < gamesPerEvening; slotIndex++) {
        if (!occupied.has(slotKey(eventId, courtId, slotIndex))) {
          empty.push({ eventId, courtId, slotIndex });
        }
      }
    }
  }
  return empty;
}

function clonePlacements(placements: PlacementWithCategory[]): PlacementWithCategory[] {
  return placements.map((placement) => ({ ...placement }));
}

function pickIndex(length: number, random: () => number) {
  return Math.floor(random() * length);
}

function pickTwoDistinctIndices(
  length: number,
  random: () => number,
): [number, number] | null {
  if (length < 2) return null;
  const first = pickIndex(length, random);
  let second = pickIndex(length - 1, random);
  if (second >= first) second += 1;
  return [first, second];
}

function unscheduledIdsFromPlacements(
  matchups: SolveScheduleMatchup[],
  placements: PlacementWithCategory[],
): string[] {
  const scheduledIds = new Set(placements.map((placement) => placement.id));
  return matchups
    .filter((matchup) => !scheduledIds.has(matchup.id))
    .map((matchup) => matchup.id);
}

function placementsWithoutCategory(
  placements: PlacementWithCategory[],
  excludeId: string,
): ScheduledMatchupPlacement[] {
  return placements.filter((placement) => placement.id !== excludeId);
}

/**
 * Events whose placement scores can change when the given events are touched:
 * each touched event plus its immediate neighbors in `orderedEventIds`.
 */
export function getAffectedEventIds(
  orderedEventIds: string[],
  touchedEventIds: Iterable<string>,
): string[] {
  const indices = new Set<number>();
  for (const eventId of touchedEventIds) {
    const index = orderedEventIds.indexOf(eventId);
    if (index === -1) continue;
    if (index > 0) indices.add(index - 1);
    indices.add(index);
    if (index < orderedEventIds.length - 1) indices.add(index + 1);
  }
  return Array.from(indices)
    .sort((a, b) => a - b)
    .flatMap((index) => {
      const eventId = orderedEventIds[index];
      return eventId ? [eventId] : [];
    });
}

/** Sum of preference scores for placements whose event is in `eventIds`. */
export function scorePlacementsOnEvents(
  placements: PlacementWithCategory[],
  eventIds: Iterable<string>,
  params: SolverScoreParams,
): number {
  const eventIdSet = eventIds instanceof Set ? eventIds : new Set(eventIds);
  if (eventIdSet.size === 0) return 0;

  let total = 0;
  for (const placement of placements) {
    if (!eventIdSet.has(placement.eventId)) continue;
    const existingPlacementsWithCategory = placements.filter(
      (other) => other.id !== placement.id,
    );
    total += getPlacementPreferenceScore({
      placement,
      categoryId: placement.categoryId,
      existingPlacements: existingPlacementsWithCategory,
      existingPlacementsWithCategory,
      orderedEventIds: params.orderedEventIds,
      maxSlotIndex: params.maxSlotIndex,
      totalMatchups: params.totalMatchups,
      categoryBalanceContext: params.categoryBalanceContext,
      farAwayTeamIds: params.farAwayTeamIds,
      categoryRankById: params.categoryRankById,
      weights: params.weights,
    });
  }
  return total;
}

function invalidMoveResult(
  placements: PlacementWithCategory[],
  unscheduledMatchupIds: string[],
): EvaluateMoveResult {
  return {
    valid: false,
    scoreDelta: 0,
    nextPlacements: placements,
    nextUnscheduled: unscheduledMatchupIds,
  };
}

function allChangedPlacementsValid(
  changedPlacements: PlacementWithCategory[],
  nextPlacements: PlacementWithCategory[],
  validationContext: ConstraintValidationContext,
): boolean {
  for (const placement of changedPlacements) {
    const reason = getPlacementViolationReason(
      placement,
      placementsWithoutCategory(nextPlacements, placement.id),
      validationContext,
    );
    if (reason) return false;
  }
  return true;
}

function evaluateAppliedMove(
  placements: PlacementWithCategory[],
  nextPlacements: PlacementWithCategory[],
  changedPlacements: PlacementWithCategory[],
  touchedEventIds: string[],
  matchups: SolveScheduleMatchup[],
  validationContext: ConstraintValidationContext,
  params: SolverScoreParams,
): EvaluateMoveResult {
  if (!allChangedPlacementsValid(changedPlacements, nextPlacements, validationContext)) {
    return invalidMoveResult(
      placements,
      unscheduledIdsFromPlacements(matchups, placements),
    );
  }

  const affectedEventIds = getAffectedEventIds(params.orderedEventIds, touchedEventIds);
  const scoreBefore = scorePlacementsOnEvents(placements, affectedEventIds, params);
  const scoreAfter = scorePlacementsOnEvents(nextPlacements, affectedEventIds, params);

  return {
    valid: true,
    scoreDelta: scoreAfter - scoreBefore,
    nextPlacements,
    nextUnscheduled: unscheduledIdsFromPlacements(matchups, nextPlacements),
  };
}

function applySwapMove(
  placements: PlacementWithCategory[],
  placementIdA: string,
  placementIdB: string,
): {
  nextPlacements: PlacementWithCategory[];
  changedPlacements: PlacementWithCategory[];
  touchedEventIds: string[];
} | null {
  if (placementIdA === placementIdB) return null;
  const placementA = placements.find((placement) => placement.id === placementIdA);
  const placementB = placements.find((placement) => placement.id === placementIdB);
  if (!placementA || !placementB) return null;
  if (
    placementA.eventId === placementB.eventId &&
    placementA.courtId === placementB.courtId &&
    placementA.slotIndex === placementB.slotIndex
  ) {
    return null;
  }

  const swappedA: PlacementWithCategory = {
    ...placementA,
    eventId: placementB.eventId,
    courtId: placementB.courtId,
    slotIndex: placementB.slotIndex,
  };
  const swappedB: PlacementWithCategory = {
    ...placementB,
    eventId: placementA.eventId,
    courtId: placementA.courtId,
    slotIndex: placementA.slotIndex,
  };
  const nextPlacements = placements.map((placement) => {
    if (placement.id === placementA.id) return swappedA;
    if (placement.id === placementB.id) return swappedB;
    return placement;
  });

  return {
    nextPlacements,
    changedPlacements: [swappedA, swappedB],
    touchedEventIds: [placementA.eventId, placementB.eventId],
  };
}

function applyRelocateMove(
  placements: PlacementWithCategory[],
  placementId: string,
  destination: EmptySlot,
  gamesPerEvening: number,
): {
  nextPlacements: PlacementWithCategory[];
  changedPlacements: PlacementWithCategory[];
  touchedEventIds: string[];
} | null {
  if (destination.slotIndex < 0 || destination.slotIndex >= gamesPerEvening) {
    return null;
  }
  if (destination.courtId !== "A" && destination.courtId !== "B") {
    return null;
  }

  const current = placements.find((placement) => placement.id === placementId);
  if (!current) return null;
  if (
    current.eventId === destination.eventId &&
    current.courtId === destination.courtId &&
    current.slotIndex === destination.slotIndex
  ) {
    return null;
  }

  const occupied = placements.some(
    (placement) =>
      placement.id !== placementId &&
      placement.eventId === destination.eventId &&
      placement.courtId === destination.courtId &&
      placement.slotIndex === destination.slotIndex,
  );
  if (occupied) return null;

  const relocated: PlacementWithCategory = {
    ...current,
    eventId: destination.eventId,
    courtId: destination.courtId,
    slotIndex: destination.slotIndex,
  };
  const nextPlacements = placements.map((placement) =>
    placement.id === placementId ? relocated : placement,
  );

  return {
    nextPlacements,
    changedPlacements: [relocated],
    touchedEventIds: [current.eventId, destination.eventId],
  };
}

function applyPoolSwapMove(
  placements: PlacementWithCategory[],
  scheduledId: string,
  unscheduledId: string,
  matchupsById: Map<string, SolveScheduleMatchup>,
): {
  nextPlacements: PlacementWithCategory[];
  changedPlacements: PlacementWithCategory[];
  touchedEventIds: string[];
} | null {
  if (scheduledId === unscheduledId) return null;
  const scheduled = placements.find((placement) => placement.id === scheduledId);
  const incoming = matchupsById.get(unscheduledId);
  if (!scheduled || !incoming) return null;
  if (placements.some((placement) => placement.id === unscheduledId)) return null;

  const incomingPlacement: PlacementWithCategory = {
    id: incoming.id,
    teamAId: incoming.teamAId,
    teamBId: incoming.teamBId,
    categoryId: incoming.categoryId,
    eventId: scheduled.eventId,
    courtId: scheduled.courtId,
    slotIndex: scheduled.slotIndex,
  };
  const nextPlacements = placements.map((placement) =>
    placement.id === scheduledId ? incomingPlacement : placement,
  );

  return {
    nextPlacements,
    changedPlacements: [incomingPlacement],
    touchedEventIds: [scheduled.eventId],
  };
}

function evaluateMoveWithParams(
  move: SolverMove,
  placements: PlacementWithCategory[],
  matchups: SolveScheduleMatchup[],
  matchupsById: Map<string, SolveScheduleMatchup>,
  validationContext: ConstraintValidationContext,
  gamesPerEvening: number,
  params: SolverScoreParams,
): EvaluateMoveResult {
  const currentUnscheduled = unscheduledIdsFromPlacements(matchups, placements);
  let applied: {
    nextPlacements: PlacementWithCategory[];
    changedPlacements: PlacementWithCategory[];
    touchedEventIds: string[];
  } | null = null;

  if (move.type === "swap") {
    applied = applySwapMove(placements, move.placementIdA, move.placementIdB);
  } else if (move.type === "relocate") {
    applied = applyRelocateMove(
      placements,
      move.placementId,
      {
        eventId: move.eventId,
        courtId: move.courtId,
        slotIndex: move.slotIndex,
      },
      gamesPerEvening,
    );
  } else {
    applied = applyPoolSwapMove(
      placements,
      move.scheduledId,
      move.unscheduledId,
      matchupsById,
    );
  }

  if (!applied) {
    return invalidMoveResult(placements, currentUnscheduled);
  }

  return evaluateAppliedMove(
    placements,
    applied.nextPlacements,
    applied.changedPlacements,
    applied.touchedEventIds,
    matchups,
    validationContext,
    params,
  );
}

/**
 * Apply a candidate move and return its validity plus quality-score delta.
 * Delta is computed by rescoring only affected events (plus neighbors).
 */
export function evaluateMove(
  move: SolverMove,
  placements: PlacementWithCategory[],
  unscheduledMatchupIds: string[],
  input: Pick<
    SolveScheduleInput,
    | "matchups"
    | "orderedEventIds"
    | "orderedCategoryIds"
    | "gamesPerEvening"
    | "validationContext"
    | "weights"
  >,
): EvaluateMoveResult {
  const params: SolverScoreParams = {
    orderedEventIds: input.orderedEventIds,
    maxSlotIndex: input.gamesPerEvening - 1,
    totalMatchups: input.matchups.length,
    categoryBalanceContext: buildCategoryBalanceContext(
      input.matchups,
      input.orderedEventIds,
    ),
    farAwayTeamIds: input.validationContext.farAwayTeamIds,
    categoryRankById: buildCategoryRankById(input.orderedCategoryIds),
    weights: input.weights,
  };
  const matchupsById = new Map(input.matchups.map((matchup) => [matchup.id, matchup]));
  const result = evaluateMoveWithParams(
    move,
    placements,
    input.matchups,
    matchupsById,
    input.validationContext,
    input.gamesPerEvening,
    params,
  );
  if (!result.valid) {
    return {
      ...result,
      nextUnscheduled: unscheduledMatchupIds,
    };
  }
  return result;
}

function proposeMove(
  placements: PlacementWithCategory[],
  unscheduledIds: string[],
  orderedEventIds: string[],
  gamesPerEvening: number,
  random: () => number,
): SolverMove | null {
  const emptySlots = listEmptySlots(orderedEventIds, gamesPerEvening, placements);
  const types: Array<SolverMove["type"]> = [];
  if (placements.length >= 2) types.push("swap");
  if (placements.length >= 1 && emptySlots.length >= 1) types.push("relocate");
  if (placements.length >= 1 && unscheduledIds.length >= 1) types.push("pool-swap");
  if (types.length === 0) return null;

  const type = types[pickIndex(types.length, random)];
  if (type === "swap") {
    const indices = pickTwoDistinctIndices(placements.length, random);
    if (!indices) return null;
    const placementA = placements[indices[0]];
    const placementB = placements[indices[1]];
    if (!placementA || !placementB) return null;
    return {
      type: "swap",
      placementIdA: placementA.id,
      placementIdB: placementB.id,
    };
  }

  if (type === "relocate") {
    const placement = placements[pickIndex(placements.length, random)];
    const slot = emptySlots[pickIndex(emptySlots.length, random)];
    if (!placement || !slot) return null;
    return {
      type: "relocate",
      placementId: placement.id,
      eventId: slot.eventId,
      courtId: slot.courtId,
      slotIndex: slot.slotIndex,
    };
  }

  const scheduled = placements[pickIndex(placements.length, random)];
  const unscheduledId = unscheduledIds[pickIndex(unscheduledIds.length, random)];
  if (!scheduled || !unscheduledId) return null;
  return {
    type: "pool-swap",
    scheduledId: scheduled.id,
    unscheduledId,
  };
}

function estimateInitialTemperature(
  placements: PlacementWithCategory[],
  matchups: SolveScheduleMatchup[],
  matchupsById: Map<string, SolveScheduleMatchup>,
  validationContext: ConstraintValidationContext,
  gamesPerEvening: number,
  params: SolverScoreParams,
  random: () => number,
): number {
  const unscheduledIds = unscheduledIdsFromPlacements(matchups, placements);
  const samples: number[] = [];
  for (let i = 0; i < TEMPERATURE_SAMPLE_MOVES; i++) {
    const move = proposeMove(
      placements,
      unscheduledIds,
      params.orderedEventIds,
      gamesPerEvening,
      random,
    );
    if (!move) continue;
    const evaluated = evaluateMoveWithParams(
      move,
      placements,
      matchups,
      matchupsById,
      validationContext,
      gamesPerEvening,
      params,
    );
    if (!evaluated.valid) continue;
    samples.push(Math.abs(evaluated.scoreDelta));
  }
  if (samples.length === 0) return DEFAULT_INITIAL_TEMPERATURE;
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  if (mean === 0) return DEFAULT_INITIAL_TEMPERATURE;
  return Math.min(80, Math.max(10, mean * 2));
}

function runSimulatedAnnealing(
  initialPlacements: PlacementWithCategory[],
  matchups: SolveScheduleMatchup[],
  validationContext: ConstraintValidationContext,
  gamesPerEvening: number,
  params: SolverScoreParams,
  effort: Exclude<SolverEffort, "greedy">,
  random: () => number,
): PlacementWithCategory[] {
  const limits = EFFORT_LIMITS[effort];
  const matchupsById = new Map(matchups.map((matchup) => [matchup.id, matchup]));
  const deadline = Date.now() + limits.timeBudgetMs;

  let currentPlacements = clonePlacements(initialPlacements);
  let bestPlacements = clonePlacements(initialPlacements);
  let bestScore = scorePlacementsOnEvents(bestPlacements, params.orderedEventIds, params);
  let currentScore = bestScore;

  let temperature = estimateInitialTemperature(
    currentPlacements,
    matchups,
    matchupsById,
    validationContext,
    gamesPerEvening,
    params,
    random,
  );

  let steps = 0;
  const maxProposalAttempts = limits.maxIterations * MAX_PROPOSAL_ATTEMPTS_PER_STEP;

  for (
    let attempts = 0;
    steps < limits.maxIterations &&
    attempts < maxProposalAttempts &&
    Date.now() < deadline &&
    temperature > MIN_TEMPERATURE;
    attempts++
  ) {
    const unscheduledIds = unscheduledIdsFromPlacements(matchups, currentPlacements);
    const move = proposeMove(
      currentPlacements,
      unscheduledIds,
      params.orderedEventIds,
      gamesPerEvening,
      random,
    );
    if (!move) continue;

    const evaluated = evaluateMoveWithParams(
      move,
      currentPlacements,
      matchups,
      matchupsById,
      validationContext,
      gamesPerEvening,
      params,
    );
    if (!evaluated.valid) continue;

    steps += 1;
    const delta = evaluated.scoreDelta;
    const accept = delta < 0 || random() < Math.exp(-delta / temperature);
    if (accept) {
      currentPlacements = evaluated.nextPlacements;
      currentScore += delta;
      if (currentScore < bestScore) {
        bestScore = currentScore;
        bestPlacements = clonePlacements(currentPlacements);
      }
    }

    temperature *= COOLING_RATE;
  }

  return bestPlacements;
}

export function solveSchedule(input: SolveScheduleInput): SolveScheduleResult {
  const {
    matchups,
    orderedEventIds,
    orderedCategoryIds,
    gamesPerEvening,
    validationContext,
    weights,
    seed,
    effort = "medium",
  } = input;

  const categoryRankById = buildCategoryRankById(orderedCategoryIds);

  if (matchups.length === 0 || orderedEventIds.length === 0 || gamesPerEvening <= 0) {
    return {
      placements: [],
      unscheduledMatchupIds: matchups.map((matchup) => matchup.id),
      metrics: {
        qualityScore: 0,
        totalCategoryDeviation: 0,
        courtCategorySwitches: 0,
        hardConflictCount: 0,
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
  const scoreParams: SolverScoreParams = {
    orderedEventIds,
    maxSlotIndex,
    totalMatchups: matchups.length,
    categoryBalanceContext,
    farAwayTeamIds,
    categoryRankById,
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
    categoryRankById,
    weights,
    maxSlotIndex,
  });

  if (effort !== "greedy") {
    const annealingRandom = createSeededRng(seed ?? DEFAULT_ANNEALING_SEED);
    finalPlacements = runSimulatedAnnealing(
      finalPlacements,
      matchups,
      validationContext,
      gamesPerEvening,
      scoreParams,
      effort,
      annealingRandom,
    );
  }

  const unscheduledMatchupIds = unscheduledIdsFromPlacements(matchups, finalPlacements);

  return {
    placements: finalPlacements,
    metrics: buildSchedulingMetrics(
      finalPlacements,
      matchups,
      scoreParams,
      validationContext,
    ),
    unscheduledMatchupIds,
  };
}
