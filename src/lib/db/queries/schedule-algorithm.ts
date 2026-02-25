/**
 * SCHEDULING ALGORITHM
 *
 * This file contains the core scheduling logic for placing volleyball matchups
 * across events and courts. It is separated from schedule.ts for clarity and
 * maintainability.
 *
 * The algorithm:
 * 1. Validates each candidate placement against hard constraints (availability, conflicts, max games)
 * 2. Scores valid placements by preference (lower = better)
 * 3. Selects the best valid matchup for each slot
 */

import { isDateUnavailable } from "~/lib/unavailable-dates";

// =============================================================================
// SECTION 1: CONSTANTS
// =============================================================================

/** Category IDs for scheduling rules. Match these to your category records in the database. */
export const CAT_FEMENIL = "cat-femenil";
export const CAT_VARONIL_LIBRE = "cat-varonil-libre";
export const CAT_SEGUNDA_FUERZA = "cat-segunda-fuerza";

/** Default max games per team per event (non-far-away teams) */
export const DEFAULT_MAX_GAMES_PER_EVENT = 2;

/** Max games per event for far-away teams (they travel farther, so we try to schedule them 3x) */
export const FAR_AWAY_MAX_GAMES_PER_EVENT = 3;

/** Centralized weights for all soft scheduling preferences. Higher means "more important". */
export const SCHEDULING_WEIGHTS = {
  eventCategoryBalance: 20,
  eventLoadBalance: 15,
  teamRestAdjacentEvent: 10,
  femenilEarlyPerSlot: 10,
  femenilCourtClustering: 8,
  categoryDistributionRun: 3,
  varonilLatePerSlot: 1,
} as const;

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
 * Rest preference: avoid teams playing in adjacent events.
 * Returns a positive value when either team already has a matchup in the previous/next event.
 */
export function getAdjacentEventRestPenaltyScore(
  placement: ScheduledMatchupPlacement,
  existingPlacements: ScheduledMatchupPlacement[],
  orderedEventIds: string[],
): number {
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
 * Femenil court clustering: cat-femenil matches need a lower net.
 * Prefer contiguous blocks on one court in each event to minimize net changes.
 * Returns 0 when the candidate extends a local femenil block on the same court.
 */
export function getFemenilCourtClusteringScore(
  placement: ScheduledMatchupPlacement,
  categoryId: string | null,
  existingPlacementsWithCategory: PlacementWithCategory[],
): number {
  if (categoryId !== CAT_FEMENIL) {
    return 0;
  }

  const sameEventPlacements = existingPlacementsWithCategory.filter(
    (p) => p.eventId === placement.eventId,
  );
  const sameCourtPlacements = sameEventPlacements.filter((p) => p.courtId === placement.courtId);
  const sameCourtHasFemenil = sameCourtPlacements.some((p) => p.categoryId === CAT_FEMENIL);
  const otherCourtHasFemenil = sameEventPlacements.some(
    (p) => p.courtId !== placement.courtId && p.categoryId === CAT_FEMENIL,
  );
  const prevSlotOnSameCourt = sameCourtPlacements.find(
    (p) =>
      p.slotIndex === placement.slotIndex - 1,
  );
  const nextSlotOnSameCourt = sameCourtPlacements.find(
    (p) =>
      p.slotIndex === placement.slotIndex + 1,
  );

  // Extending or bridging a block on this court is ideal.
  if (
    prevSlotOnSameCourt?.categoryId === CAT_FEMENIL ||
    nextSlotOnSameCourt?.categoryId === CAT_FEMENIL
  ) {
    return 0;
  }

  // First femenil game in the event has no clustering penalty.
  if (!sameCourtHasFemenil && !otherCourtHasFemenil) {
    return 0;
  }

  // Prefer continuing femenil on the court where a femenil block already exists.
  if (!sameCourtHasFemenil && otherCourtHasFemenil) {
    return 2;
  }

  // If femenil exists on this court but candidate does not connect to it, lightly penalize.
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
 * Varonil-libre late preference: cat-varonil-libre prefers to play later in the night.
 * Score: higher slotIndex = lower score (better). We use (maxSlotIndex - slotIndex) as penalty.
 */
export function getVaronilLibreLatePreferenceScore(
  placement: ScheduledMatchupPlacement,
  categoryId: string | null,
  maxSlotIndex: number,
): number {
  if (categoryId !== CAT_VARONIL_LIBRE) {
    return 0;
  }

  // Later slots (higher slotIndex) are preferred - so we penalize early slots
  return maxSlotIndex - placement.slotIndex;
}

/**
 * Femenil early preference: two-sided slot pressure.
 * - Femenil games get a quadratic penalty for late slots (strongly pushed early).
 * - Non-femenil games get a linear penalty for early slots (gently pushed later
 *   to make room for femenil).
 */
export function getFemenilEarlyPreferenceScore(
  placement: ScheduledMatchupPlacement,
  categoryId: string | null,
  maxSlotIndex: number,
): number {
  if (categoryId === CAT_FEMENIL) {
    return placement.slotIndex ** 2;
  }

  return Math.max(0, maxSlotIndex - placement.slotIndex);
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
  if (!categoryId || !categoryBalanceContext || categoryBalanceContext.categoryIds.length === 0) {
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
  const eventTargets = categoryBalanceContext.eventCategoryTargetByEventId.get(placement.eventId);
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

/** Parameters for computing placement preference score */
export type PlacementPreferenceParams = {
  placement: ScheduledMatchupPlacement;
  categoryId: string | null;
  existingPlacements: ScheduledMatchupPlacement[];
  existingPlacementsWithCategory: PlacementWithCategory[];
  orderedEventIds: string[];
  maxSlotIndex: number;
  totalMatchups: number;
  categoryBalanceContext: CategoryBalanceContext | null;
};

export type PlacementPreferenceBreakdown = {
  raw: {
    restPenalty: number;
    femenilClustering: number;
    categoryDistribution: number;
    varonilLate: number;
    femenilEarly: number;
    eventCategoryBalance: number;
    eventLoadBalance: number;
  };
  weighted: {
    restPenalty: number;
    femenilClustering: number;
    categoryDistribution: number;
    varonilLate: number;
    femenilEarly: number;
    eventCategoryBalance: number;
    eventLoadBalance: number;
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
    totalMatchups,
    categoryBalanceContext,
  } = params;

  const restPenalty = getAdjacentEventRestPenaltyScore(
    placement,
    existingPlacements,
    orderedEventIds,
  );
  const femenilClustering = getFemenilCourtClusteringScore(
    placement,
    categoryId,
    existingPlacementsWithCategory,
  );
  const categoryDistribution = getCategoryDistributionScore(
    placement,
    categoryId,
    existingPlacementsWithCategory,
  );
  const varonilLate = getVaronilLibreLatePreferenceScore(
    placement,
    categoryId,
    maxSlotIndex,
  );
  const femenilEarly = getFemenilEarlyPreferenceScore(placement, categoryId, maxSlotIndex);
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

  const weighted = {
    restPenalty: restPenalty * SCHEDULING_WEIGHTS.teamRestAdjacentEvent,
    femenilClustering: femenilClustering * SCHEDULING_WEIGHTS.femenilCourtClustering,
    categoryDistribution:
      categoryDistribution * SCHEDULING_WEIGHTS.categoryDistributionRun,
    varonilLate: varonilLate * SCHEDULING_WEIGHTS.varonilLatePerSlot,
    femenilEarly: femenilEarly * SCHEDULING_WEIGHTS.femenilEarlyPerSlot,
    eventCategoryBalance:
      eventCategoryBalance * SCHEDULING_WEIGHTS.eventCategoryBalance,
    eventLoadBalance:
      eventLoadBalance * SCHEDULING_WEIGHTS.eventLoadBalance,
  };

  const total =
    weighted.restPenalty +
    weighted.femenilClustering +
    weighted.categoryDistribution +
    weighted.varonilLate +
    weighted.femenilEarly +
    weighted.eventCategoryBalance +
    weighted.eventLoadBalance;

  return {
    raw: {
      restPenalty,
      femenilClustering,
      categoryDistribution,
      varonilLate,
      femenilEarly,
      eventCategoryBalance,
      eventLoadBalance,
    },
    weighted,
    total,
  };
}

/**
 * Combined preference score for a placement. Lower = better.
 * Sums all preference scores (rest, femenil clustering, category distribution,
 * varonil late, femenil early, and event category balance).
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
  totalMatchups: number;
  categoryBalanceContext: CategoryBalanceContext | null;
};

/**
 * Total schedule quality score (lower = better).
 * Sums placement preference scores for each placement, using all other placements as context.
 */
export function getScheduleQualityScore(params: ScheduleQualityParams): number {
  const { placementsWithCategory, orderedEventIds, maxSlotIndex, totalMatchups, categoryBalanceContext } = params;

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
      totalMatchups,
      categoryBalanceContext,
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
    totalMatchups: number;
    categoryBalanceContext: CategoryBalanceContext | null;
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
    totalMatchups: params.totalMatchups,
    categoryBalanceContext: params.categoryBalanceContext,
  });
  const scoreAfter = getScheduleQualityScore({
    placementsWithCategory: placementsAfter,
    orderedEventIds: params.orderedEventIds,
    maxSlotIndex: params.maxSlotIndex,
    totalMatchups: params.totalMatchups,
    categoryBalanceContext: params.categoryBalanceContext,
  });

  return {
    valid: true,
    scoreImprovement: scoreBefore - scoreAfter,
    swappedPlacements: [swappedA, swappedB],
  };
}

/**
 * Count net switches by event/court timeline.
 * A switch is counted whenever consecutive matches on the same court change
 * between femenil and non-femenil categories.
 */
export function getEstimatedFemenilNetSwitchCount(
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
      const prevIsFemenil = ordered[i - 1]?.categoryId === CAT_FEMENIL;
      const currentIsFemenil = ordered[i]?.categoryId === CAT_FEMENIL;
      if (prevIsFemenil !== currentIsFemenil) {
        switches += 1;
      }
    }
  }

  return switches;
}
