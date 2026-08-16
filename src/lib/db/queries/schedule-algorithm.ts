/**
 * SCHEDULING ALGORITHM
 *
 * This file contains the core scheduling logic for placing volleyball matchups
 * across events and courts. It is separated from schedule.ts for clarity and
 * maintainability.
 *
 * The algorithm:
 * 1. Validates each candidate placement against hard constraints (availability, conflicts, rematches, max games)
 * 2. Scores valid placements by preference (lower = better)
 * 3. Selects the best valid matchup for each slot
 */

import { unorderedTeamPairKey } from "~/lib/schedule/matchup-pair";
import { isDateUnavailable } from "~/lib/unavailable-dates";
import {
  DEFAULT_SCHEDULING_WEIGHTS,
  type SchedulingWeights,
} from "~/validators/scheduling.validators";

export { DEFAULT_SCHEDULING_WEIGHTS };
export const SCHEDULING_WEIGHTS = DEFAULT_SCHEDULING_WEIGHTS;
export type { SchedulingWeights };

// =============================================================================
// SECTION 1: CONSTANTS
// =============================================================================

/** Default max games per team per event (non-far-away teams) */
export const DEFAULT_MAX_GAMES_PER_EVENT = DEFAULT_SCHEDULING_WEIGHTS.maxGamesPerEvent;

/** Max games per event for far-away teams (same hard cap as default; they get scheduling priority via scoring bonus) */
export const FAR_AWAY_MAX_GAMES_PER_EVENT =
  DEFAULT_SCHEDULING_WEIGHTS.farAwayMaxGamesPerEvent;

/** Max iterations for swap-based optimization pass */
export const OPTIMIZATION_MAX_PASSES = 15;

// =============================================================================
// SECTION 2: TYPES
// =============================================================================

/** A placement of a matchup into a specific event, court, and slot */
export type ScheduledMatchupPlacement = {
  id: string;
  teamAId: string;
  teamBId: string;
  eventId: string;
  courtId: "A" | "B";
  slotIndex: number;
};

/** Placement with category for scoring (used when we need to know category of already-placed matchups) */
export type PlacementWithCategory = ScheduledMatchupPlacement & {
  categoryId: string | null;
};

/** Context for constraint validation - per-team max games for far-away teams */
export type ConstraintValidationContext = {
  eventDateById: Map<string, string>;
  teamUnavailableDatesById: Map<string, string>;
  maxGamesPerTeamId: Map<string, number>;
  farAwayTeamIds: Set<string>;
};

/** Matchup with metadata needed for scheduling (category, etc.) */
export type MatchupWithMeta = {
  id: string;
  teamAId: string;
  teamBId: string;
  categoryId: string | null;
};

/** Global category targets used to keep per-event category distribution proportional. */
export type CategoryBalanceContext = {
  categoryIds: string[];
  eventCategoryTargetByEventId: Map<string, Map<string, number>>;
};

// =============================================================================
// SECTION 3: CONSTRAINT VALIDATION
// =============================================================================

/**
 * Check if two matchups share any team (same team cannot play two matches at once)
 */
export function teamsOverlap(
  teamAId: string,
  teamBId: string,
  otherTeamAId: string,
  otherTeamBId: string,
) {
  return (
    teamAId === otherTeamAId ||
    teamAId === otherTeamBId ||
    teamBId === otherTeamAId ||
    teamBId === otherTeamBId
  );
}

/**
 * Validate a placement against hard constraints.
 * Returns null if valid, or an error message if invalid.
 */
export function getPlacementViolationReason(
  placement: ScheduledMatchupPlacement,
  existingPlacements: ScheduledMatchupPlacement[],
  context: ConstraintValidationContext,
): string | null {
  const eventDate = context.eventDateById.get(placement.eventId);
  if (!eventDate) {
    return "Selected event was not found.";
  }

  const teamAUnavailableDates =
    context.teamUnavailableDatesById.get(placement.teamAId) ?? "";
  if (isDateUnavailable(teamAUnavailableDates, eventDate)) {
    return "Team A is unavailable for this event date.";
  }

  const teamBUnavailableDates =
    context.teamUnavailableDatesById.get(placement.teamBId) ?? "";
  if (isDateUnavailable(teamBUnavailableDates, eventDate)) {
    return "Team B is unavailable for this event date.";
  }

  const slotConflict = existingPlacements.find(
    (existing) =>
      existing.eventId === placement.eventId &&
      existing.slotIndex === placement.slotIndex &&
      teamsOverlap(
        placement.teamAId,
        placement.teamBId,
        existing.teamAId,
        existing.teamBId,
      ),
  );
  if (slotConflict) {
    return "A team cannot play two matches at the same time.";
  }

  const rematchSameNight = existingPlacements.find(
    (existing) =>
      existing.eventId === placement.eventId &&
      unorderedTeamPairKey(existing.teamAId, existing.teamBId) ===
        unorderedTeamPairKey(placement.teamAId, placement.teamBId),
  );
  if (rematchSameNight) {
    return "These two teams already play each other at this event.";
  }

  const maxTeamA =
    context.maxGamesPerTeamId.get(placement.teamAId) ?? DEFAULT_MAX_GAMES_PER_EVENT;
  const teamAGamesInEvent =
    existingPlacements.filter(
      (existing) =>
        existing.eventId === placement.eventId &&
        (existing.teamAId === placement.teamAId ||
          existing.teamBId === placement.teamAId),
    ).length + 1;
  if (teamAGamesInEvent > maxTeamA) {
    return `A team can only play ${maxTeamA} games per event.`;
  }

  const maxTeamB =
    context.maxGamesPerTeamId.get(placement.teamBId) ?? DEFAULT_MAX_GAMES_PER_EVENT;
  const teamBGamesInEvent =
    existingPlacements.filter(
      (existing) =>
        existing.eventId === placement.eventId &&
        (existing.teamAId === placement.teamBId ||
          existing.teamBId === placement.teamBId),
    ).length + 1;
  if (teamBGamesInEvent > maxTeamB) {
    return `A team can only play ${maxTeamB} games per event.`;
  }

  return null;
}

// =============================================================================
// SECTION 4: PREFERENCE SCORING FUNCTIONS
// Lower score = better placement
// =============================================================================

/**
 * Rest preference: avoid far-away teams playing in adjacent events.
 * Only applies when at least one team in the matchup is far away.
 * Returns a positive value when either far-away team already has a matchup in the previous/next event.
 */
export function getAdjacentEventRestPenaltyScore(
  placement: ScheduledMatchupPlacement,
  existingPlacements: ScheduledMatchupPlacement[],
  orderedEventIds: string[],
  farAwayTeamIds: Set<string>,
): number {
  if (!farAwayTeamIds.has(placement.teamAId) && !farAwayTeamIds.has(placement.teamBId)) {
    return 0;
  }

  const eventIndex = orderedEventIds.indexOf(placement.eventId);
  if (eventIndex === -1) {
    return 0;
  }

  const previousEventId = orderedEventIds[eventIndex - 1];
  const nextEventId = orderedEventIds[eventIndex + 1];
  const adjacentEventIds = [previousEventId, nextEventId].filter(
    (eventId): eventId is string => Boolean(eventId),
  );
  if (adjacentEventIds.length === 0) {
    return 0;
  }

  const getTeamEventIds = (teamId: string) =>
    new Set(
      existingPlacements
        .filter((existing) => existing.teamAId === teamId || existing.teamBId === teamId)
        .map((existing) => existing.eventId),
    );

  const teamAEventIds = getTeamEventIds(placement.teamAId);
  const teamBEventIds = getTeamEventIds(placement.teamBId);

  let score = 0;
  for (const adjacentEventId of adjacentEventIds) {
    if (teamAEventIds.has(adjacentEventId)) score += 1;
    if (teamBEventIds.has(adjacentEventId)) score += 1;
  }

  return score;
}

/**
 * Court clustering: keep a category's games contiguous on one court in each event.
 * Returns 0 when the candidate extends a local block of the same category.
 */
export function getCategoryCourtClusteringScore(
  placement: ScheduledMatchupPlacement,
  categoryId: string | null,
  existingPlacementsWithCategory: PlacementWithCategory[],
): number {
  if (!categoryId) {
    return 0;
  }

  const sameEventPlacements = existingPlacementsWithCategory.filter(
    (p) => p.eventId === placement.eventId,
  );
  const sameCourtPlacements = sameEventPlacements.filter(
    (p) => p.courtId === placement.courtId,
  );
  const sameCourtHasCategory = sameCourtPlacements.some(
    (p) => p.categoryId === categoryId,
  );
  const otherCourtHasCategory = sameEventPlacements.some(
    (p) => p.courtId !== placement.courtId && p.categoryId === categoryId,
  );
  const prevSlotOnSameCourt = sameCourtPlacements.find(
    (p) => p.slotIndex === placement.slotIndex - 1,
  );
  const nextSlotOnSameCourt = sameCourtPlacements.find(
    (p) => p.slotIndex === placement.slotIndex + 1,
  );

  if (
    prevSlotOnSameCourt?.categoryId === categoryId ||
    nextSlotOnSameCourt?.categoryId === categoryId
  ) {
    return 0;
  }

  if (!sameCourtHasCategory && !otherCourtHasCategory) {
    return 0;
  }

  if (!sameCourtHasCategory && otherCourtHasCategory) {
    return 2;
  }

  return 1;
}

/**
 * Category distribution: Avoid long runs of the same category within an event.
 * We want variety - don't want an event consisting of just one category.
 * Penalty when adding this matchup would create 3+ consecutive same-category matches.
 */
export function getCategoryDistributionScore(
  placement: ScheduledMatchupPlacement,
  categoryId: string | null,
  existingPlacementsWithCategory: PlacementWithCategory[],
): number {
  const eventPlacements = existingPlacementsWithCategory
    .filter((p) => p.eventId === placement.eventId)
    .sort((a, b) => {
      const slotCompare = a.slotIndex - b.slotIndex;
      if (slotCompare !== 0) return slotCompare;
      return a.courtId.localeCompare(b.courtId);
    });

  if (eventPlacements.length === 0) {
    return 0;
  }

  // Count consecutive same-category at end of event (by placement order)
  let runLength = 0;
  const lastCategory = eventPlacements[eventPlacements.length - 1]?.categoryId ?? null;
  for (let i = eventPlacements.length - 1; i >= 0; i--) {
    if (eventPlacements[i]?.categoryId === lastCategory) {
      runLength++;
    } else {
      break;
    }
  }

  // If we're adding same category to a run of 2+, we'd have 3+ consecutive
  if (categoryId === lastCategory && runLength >= 2) {
    return 1;
  }

  return 0;
}

/**
 * Rank-based time-of-night preference.
 * Category rank 0 prefers the earliest slot; the last rank prefers the latest.
 * Penalty is |normalizedSlot − target| raised to the configured curve exponent.
 */
export function getCategoryTimePreferenceScore(
  placement: ScheduledMatchupPlacement,
  categoryId: string | null,
  maxSlotIndex: number,
  categoryRankById: Map<string, number>,
  weights: SchedulingWeights = DEFAULT_SCHEDULING_WEIGHTS,
): number {
  if (!categoryId || maxSlotIndex <= 0) {
    return 0;
  }

  const rank = categoryRankById.get(categoryId);
  if (rank === undefined) {
    return 0;
  }

  const categoryCount = categoryRankById.size;
  if (categoryCount <= 1) {
    return 0;
  }

  const target = rank / (categoryCount - 1);
  const actual = placement.slotIndex / maxSlotIndex;
  return Math.abs(actual - target) ** weights.categoryTimeCurveExponent;
}

export function buildCategoryRankById(orderedCategoryIds: string[]): Map<string, number> {
  return new Map(orderedCategoryIds.map((id, index) => [id, index]));
}

/**
 * Per-event category balance: Avoid placing a matchup in an event where that category
 * is already over-represented. Uses smooth deviation from ideal per-category count.
 */
export function getEventCategoryBalanceScore(
  placement: ScheduledMatchupPlacement,
  categoryId: string | null,
  existingPlacementsWithCategory: PlacementWithCategory[],
  categoryBalanceContext: CategoryBalanceContext | null,
): number {
  if (
    !categoryId ||
    !categoryBalanceContext ||
    categoryBalanceContext.categoryIds.length === 0
  ) {
    return 0;
  }

  const eventPlacements = existingPlacementsWithCategory.filter(
    (p) => p.eventId === placement.eventId,
  );
  const categoryCounts = new Map<string, number>();
  for (const p of eventPlacements) {
    if (p.categoryId) {
      categoryCounts.set(p.categoryId, (categoryCounts.get(p.categoryId) ?? 0) + 1);
    }
  }
  categoryCounts.set(categoryId, (categoryCounts.get(categoryId) ?? 0) + 1);
  const eventTargets = categoryBalanceContext.eventCategoryTargetByEventId.get(
    placement.eventId,
  );
  if (!eventTargets) {
    return 0;
  }

  let deviation = 0;
  for (const catId of categoryBalanceContext.categoryIds) {
    const count = categoryCounts.get(catId) ?? 0;
    const target = eventTargets.get(catId) ?? 0;
    deviation += Math.abs(count - target);
  }

  return deviation;
}

/**
 * Far-away scheduling priority: strongly encourage giving far-away teams 2 games per event.
 * Context-aware: returns a large negative value (bonus) when placing a far-away team's
 * 2nd game in an event, overcoming load-balance pressure to spread games across events.
 */
export function getFarAwaySchedulingPriorityScore(
  placement: ScheduledMatchupPlacement,
  existingPlacements: ScheduledMatchupPlacement[],
  farAwayTeamIds: Set<string>,
): number {
  const teamAIsFarAway = farAwayTeamIds.has(placement.teamAId);
  const teamBIsFarAway = farAwayTeamIds.has(placement.teamBId);

  if (!teamAIsFarAway && !teamBIsFarAway) {
    return 1;
  }

  const farAwayTeamsInMatchup = [
    ...(teamAIsFarAway ? [placement.teamAId] : []),
    ...(teamBIsFarAway ? [placement.teamBId] : []),
  ];

  for (const farAwayTeamId of farAwayTeamsInMatchup) {
    const gamesInEvent = existingPlacements.filter(
      (p) =>
        p.eventId === placement.eventId &&
        (p.teamAId === farAwayTeamId || p.teamBId === farAwayTeamId),
    ).length;

    if (gamesInEvent === 1) {
      return -3;
    }
  }

  return 0;
}

/**
 * Event load balance: penalize placing a matchup in an event that already has
 * more than its fair share of total games (totalMatchups / numEvents).
 */
export function getEventLoadBalanceScore(
  placement: ScheduledMatchupPlacement,
  existingPlacements: ScheduledMatchupPlacement[],
  totalMatchups: number,
  numEvents: number,
): number {
  if (numEvents === 0) return 0;
  const idealPerEvent = totalMatchups / numEvents;
  const currentEventCount = existingPlacements.filter(
    (p) => p.eventId === placement.eventId,
  ).length;
  return Math.max(0, currentEventCount + 1 - idealPerEvent);
}

// =============================================================================
// SECTION 5: COMBINED SCORING
// =============================================================================

function resolveMaxSlotIndex(
  eventId: string,
  maxSlotIndex: number,
  maxSlotIndexByEventId?: Record<string, number>,
): number {
  return maxSlotIndexByEventId?.[eventId] ?? maxSlotIndex;
}

/** Parameters for computing placement preference score */
export type PlacementPreferenceParams = {
  placement: ScheduledMatchupPlacement;
  categoryId: string | null;
  existingPlacements: ScheduledMatchupPlacement[];
  existingPlacementsWithCategory: PlacementWithCategory[];
  orderedEventIds: string[];
  maxSlotIndex: number;
  /** When set, category time-of-night scoring uses this event's last slot. */
  maxSlotIndexByEventId?: Record<string, number>;
  totalMatchups: number;
  categoryBalanceContext: CategoryBalanceContext | null;
  farAwayTeamIds: Set<string>;
  categoryRankById: Map<string, number>;
  weights: SchedulingWeights;
};

export type PlacementPreferenceBreakdown = {
  raw: {
    restPenalty: number;
    categoryCourtClustering: number;
    categoryDistribution: number;
    categoryTimePreference: number;
    eventCategoryBalance: number;
    eventLoadBalance: number;
    farAwayPriority: number;
  };
  weighted: {
    restPenalty: number;
    categoryCourtClustering: number;
    categoryDistribution: number;
    categoryTimePreference: number;
    eventCategoryBalance: number;
    eventLoadBalance: number;
    farAwayPriority: number;
  };
  total: number;
};

export function getPlacementPreferenceBreakdown(
  params: PlacementPreferenceParams,
): PlacementPreferenceBreakdown {
  const {
    placement,
    categoryId,
    existingPlacements,
    existingPlacementsWithCategory,
    orderedEventIds,
    maxSlotIndex,
    maxSlotIndexByEventId,
    totalMatchups,
    categoryBalanceContext,
    farAwayTeamIds,
    categoryRankById,
    weights,
  } = params;

  const restPenalty = getAdjacentEventRestPenaltyScore(
    placement,
    existingPlacements,
    orderedEventIds,
    farAwayTeamIds,
  );
  const categoryCourtClustering = getCategoryCourtClusteringScore(
    placement,
    categoryId,
    existingPlacementsWithCategory,
  );
  const categoryDistribution = getCategoryDistributionScore(
    placement,
    categoryId,
    existingPlacementsWithCategory,
  );
  const categoryTimePreference = getCategoryTimePreferenceScore(
    placement,
    categoryId,
    resolveMaxSlotIndex(placement.eventId, maxSlotIndex, maxSlotIndexByEventId),
    categoryRankById,
    weights,
  );
  const eventCategoryBalance = getEventCategoryBalanceScore(
    placement,
    categoryId,
    existingPlacementsWithCategory,
    categoryBalanceContext,
  );
  const eventLoadBalance = getEventLoadBalanceScore(
    placement,
    existingPlacements,
    totalMatchups,
    orderedEventIds.length,
  );
  const farAwayPriority = getFarAwaySchedulingPriorityScore(
    placement,
    existingPlacements,
    farAwayTeamIds,
  );

  const weighted = {
    restPenalty: restPenalty * weights.teamRestAdjacentEvent,
    categoryCourtClustering: categoryCourtClustering * weights.categoryCourtClustering,
    categoryDistribution: categoryDistribution * weights.categoryDistributionRun,
    categoryTimePreference: categoryTimePreference * weights.categoryTimePreference,
    eventCategoryBalance: eventCategoryBalance * weights.eventCategoryBalance,
    eventLoadBalance: eventLoadBalance * weights.eventLoadBalance,
    farAwayPriority: farAwayPriority * weights.farAwaySchedulingPriority,
  };

  const total =
    weighted.restPenalty +
    weighted.categoryCourtClustering +
    weighted.categoryDistribution +
    weighted.categoryTimePreference +
    weighted.eventCategoryBalance +
    weighted.eventLoadBalance +
    weighted.farAwayPriority;

  return {
    raw: {
      restPenalty,
      categoryCourtClustering,
      categoryDistribution,
      categoryTimePreference,
      eventCategoryBalance,
      eventLoadBalance,
      farAwayPriority,
    },
    weighted,
    total,
  };
}

/**
 * Combined preference score for a placement. Lower = better.
 * Sums rest, court clustering, category distribution, time preference,
 * event category balance, load balance, and far-away priority.
 */
export function getPlacementPreferenceScore(params: PlacementPreferenceParams): number {
  return getPlacementPreferenceBreakdown(params).total;
}

// =============================================================================
// SECTION 6: SCHEDULE QUALITY & SWAP OPTIMIZATION
// =============================================================================

/** Parameters for computing total schedule quality score */
export type ScheduleQualityParams = {
  placementsWithCategory: PlacementWithCategory[];
  orderedEventIds: string[];
  maxSlotIndex: number;
  maxSlotIndexByEventId?: Record<string, number>;
  totalMatchups: number;
  categoryBalanceContext: CategoryBalanceContext | null;
  farAwayTeamIds: Set<string>;
  categoryRankById: Map<string, number>;
  weights: SchedulingWeights;
};

/**
 * Total schedule quality score (lower = better).
 * Sums placement preference scores for each placement, using all other placements as context.
 */
export function getScheduleQualityScore(params: ScheduleQualityParams): number {
  const {
    placementsWithCategory,
    orderedEventIds,
    maxSlotIndex,
    maxSlotIndexByEventId,
    totalMatchups,
    categoryBalanceContext,
    farAwayTeamIds,
    categoryRankById,
    weights,
  } = params;

  let total = 0;
  for (const placement of placementsWithCategory) {
    const existingPlacements = placementsWithCategory
      .filter((p) => p.id !== placement.id)
      .map((p) => ({
        id: p.id,
        teamAId: p.teamAId,
        teamBId: p.teamBId,
        eventId: p.eventId,
        courtId: p.courtId,
        slotIndex: p.slotIndex,
      }));
    const existingPlacementsWithCategory = placementsWithCategory.filter(
      (p) => p.id !== placement.id,
    );
    total += getPlacementPreferenceScore({
      placement,
      categoryId: placement.categoryId,
      existingPlacements,
      existingPlacementsWithCategory,
      orderedEventIds,
      maxSlotIndex,
      maxSlotIndexByEventId,
      totalMatchups,
      categoryBalanceContext,
      farAwayTeamIds,
      categoryRankById,
      weights,
    });
  }
  return total;
}

/** Result of evaluating a swap between two placements */
export type SwapEvaluationResult = {
  valid: boolean;
  scoreImprovement: number;
  swappedPlacements: [PlacementWithCategory, PlacementWithCategory];
};

/**
 * Evaluate swapping two placements. Returns whether the swap is valid and improves the score.
 * scoreImprovement > 0 means the swap would improve (lower) the total score.
 */
export function evaluatePlacementSwap(
  placementA: PlacementWithCategory,
  placementB: PlacementWithCategory,
  allPlacementsWithCategory: PlacementWithCategory[],
  context: ConstraintValidationContext,
  params: {
    orderedEventIds: string[];
    maxSlotIndex: number;
    maxSlotIndexByEventId?: Record<string, number>;
    totalMatchups: number;
    categoryBalanceContext: CategoryBalanceContext | null;
    farAwayTeamIds: Set<string>;
    categoryRankById: Map<string, number>;
    weights: SchedulingWeights;
  },
): SwapEvaluationResult {
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

  const placementsAfter = allPlacementsWithCategory.map((p) => {
    if (p.id === placementA.id) return swappedA;
    if (p.id === placementB.id) return swappedB;
    return p;
  });

  const placementsAfterWithoutCategory = placementsAfter.map((p) => ({
    id: p.id,
    teamAId: p.teamAId,
    teamBId: p.teamBId,
    eventId: p.eventId,
    courtId: p.courtId,
    slotIndex: p.slotIndex,
  }));

  const violationA = getPlacementViolationReason(
    swappedA,
    placementsAfterWithoutCategory.filter((p) => p.id !== placementA.id),
    context,
  );
  const violationB = getPlacementViolationReason(
    swappedB,
    placementsAfterWithoutCategory.filter((p) => p.id !== placementB.id),
    context,
  );

  if (violationA || violationB) {
    return {
      valid: false,
      scoreImprovement: 0,
      swappedPlacements: [swappedA, swappedB],
    };
  }

  const scoreBefore = getScheduleQualityScore({
    placementsWithCategory: allPlacementsWithCategory,
    orderedEventIds: params.orderedEventIds,
    maxSlotIndex: params.maxSlotIndex,
    maxSlotIndexByEventId: params.maxSlotIndexByEventId,
    totalMatchups: params.totalMatchups,
    categoryBalanceContext: params.categoryBalanceContext,
    farAwayTeamIds: params.farAwayTeamIds,
    categoryRankById: params.categoryRankById,
    weights: params.weights,
  });
  const scoreAfter = getScheduleQualityScore({
    placementsWithCategory: placementsAfter,
    orderedEventIds: params.orderedEventIds,
    maxSlotIndex: params.maxSlotIndex,
    maxSlotIndexByEventId: params.maxSlotIndexByEventId,
    totalMatchups: params.totalMatchups,
    categoryBalanceContext: params.categoryBalanceContext,
    farAwayTeamIds: params.farAwayTeamIds,
    categoryRankById: params.categoryRankById,
    weights: params.weights,
  });

  return {
    valid: true,
    scoreImprovement: scoreBefore - scoreAfter,
    swappedPlacements: [swappedA, swappedB],
  };
}

/**
 * Count category switches by event/court timeline.
 * A switch is counted whenever consecutive matches on the same court change category.
 */
export function getCourtCategorySwitchCount(
  placementsWithCategory: PlacementWithCategory[],
): number {
  const byEventCourt = new Map<string, PlacementWithCategory[]>();
  for (const placement of placementsWithCategory) {
    const key = `${placement.eventId}:${placement.courtId}`;
    const list = byEventCourt.get(key) ?? [];
    list.push(placement);
    byEventCourt.set(key, list);
  }

  let switches = 0;
  for (const placements of byEventCourt.values()) {
    const ordered = placements
      .slice()
      .sort((a, b) => a.slotIndex - b.slotIndex || a.id.localeCompare(b.id));
    for (let i = 1; i < ordered.length; i++) {
      const previousCategory = ordered[i - 1]?.categoryId ?? null;
      const currentCategory = ordered[i]?.categoryId ?? null;
      if (previousCategory !== currentCategory) {
        switches += 1;
      }
    }
  }

  return switches;
}

/**
 * Count placements that violate a hard constraint when evaluated against the rest.
 */
export function countHardConflicts(
  placements: ScheduledMatchupPlacement[],
  context: ConstraintValidationContext,
): number {
  let count = 0;
  for (const placement of placements) {
    const others = placements.filter((other) => other.id !== placement.id);
    if (getPlacementViolationReason(placement, others, context)) {
      count += 1;
    }
  }
  return count;
}
