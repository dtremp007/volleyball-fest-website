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

/** Penalty when femenil matchup is not placed back-to-back on same court */
export const FEMENIL_COURT_CLUSTERING_PENALTY = 10;

/** Penalty when adding matchup would create 3+ consecutive same-category matches in event */
export const CATEGORY_DISTRIBUTION_PENALTY = 5;

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
 * Consecutive event preference: Prefer teams that play on consecutive event dates.
 * Reduces travel for teams by having them play on back-to-back nights when possible.
 */
export function getConsecutiveEventPreferenceScore(
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
 * Prefer placing femenil matches back-to-back on the same court to minimize net adjustments.
 * Score: 0 if previous slot on same court is femenil; penalty otherwise.
 */
export function getFemenilCourtClusteringScore(
  placement: ScheduledMatchupPlacement,
  categoryId: string | null,
  existingPlacementsWithCategory: PlacementWithCategory[],
): number {
  if (categoryId !== CAT_FEMENIL) {
    return 0;
  }

  const prevSlotOnSameCourt = existingPlacementsWithCategory.find(
    (p) =>
      p.eventId === placement.eventId &&
      p.courtId === placement.courtId &&
      p.slotIndex === placement.slotIndex - 1,
  );

  if (!prevSlotOnSameCourt) {
    return 0; // First slot on court - no clustering possible
  }

  return prevSlotOnSameCourt.categoryId === CAT_FEMENIL
    ? 0
    : FEMENIL_COURT_CLUSTERING_PENALTY;
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
    return CATEGORY_DISTRIBUTION_PENALTY;
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
};

/**
 * Combined preference score for a placement. Lower = better.
 * Sums all preference scores (consecutive events, femenil clustering, category distribution, varonil late).
 */
export function getPlacementPreferenceScore(params: PlacementPreferenceParams): number {
  const {
    placement,
    categoryId,
    existingPlacements,
    existingPlacementsWithCategory,
    orderedEventIds,
    maxSlotIndex,
  } = params;

  const consecutiveScore = getConsecutiveEventPreferenceScore(
    placement,
    existingPlacements,
    orderedEventIds,
  );
  const femenilScore = getFemenilCourtClusteringScore(
    placement,
    categoryId,
    existingPlacementsWithCategory,
  );
  const categoryDistScore = getCategoryDistributionScore(
    placement,
    categoryId,
    existingPlacementsWithCategory,
  );
  const varonilScore = getVaronilLibreLatePreferenceScore(
    placement,
    categoryId,
    maxSlotIndex,
  );

  return consecutiveScore + femenilScore + categoryDistScore + varonilScore;
}
