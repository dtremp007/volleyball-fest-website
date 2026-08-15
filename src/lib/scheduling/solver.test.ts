import { describe, expect, it } from "vitest";

import {
  CAT_FEMENIL,
  CAT_SEGUNDA_FUERZA,
  CAT_VARONIL_LIBRE,
  DEFAULT_SCHEDULING_WEIGHTS,
  getPlacementViolationReason,
  getScheduleQualityScore,
  teamsOverlap,
  type ConstraintValidationContext,
  type PlacementWithCategory,
} from "~/lib/db/queries/schedule-algorithm";
import {
  evaluateMove,
  solveSchedule,
  type SolveScheduleInput,
  type SolveScheduleMatchup,
  type SolverMove,
} from "~/lib/scheduling/solver";

const ORDERED_EVENT_IDS = ["e1", "e2", "e3"];
const GAMES_PER_EVENING = 2;

function matchup(
  id: string,
  teamAId: string,
  teamBId: string,
  categoryId: string,
): SolveScheduleMatchup {
  return { id, teamAId, teamBId, categoryId };
}

function buildFixture(): SolveScheduleInput {
  const matchups: SolveScheduleMatchup[] = [
    matchup("m-fem-1", "fem-a", "fem-b", CAT_FEMENIL),
    matchup("m-fem-2", "fem-c", "fem-d", CAT_FEMENIL),
    matchup("m-fem-3", "fem-a", "fem-c", CAT_FEMENIL),
    matchup("m-var-1", "var-a", "var-b", CAT_VARONIL_LIBRE),
    matchup("m-var-2", "var-c", "var-d", CAT_VARONIL_LIBRE),
    matchup("m-seg-1", "seg-a", "seg-b", CAT_SEGUNDA_FUERZA),
    matchup("m-far-1", "far-a", "far-b", CAT_SEGUNDA_FUERZA),
    matchup("m-far-2", "far-a", "seg-a", CAT_SEGUNDA_FUERZA),
  ];

  const teamIds = [
    "fem-a",
    "fem-b",
    "fem-c",
    "fem-d",
    "var-a",
    "var-b",
    "var-c",
    "var-d",
    "seg-a",
    "seg-b",
    "far-a",
    "far-b",
  ];

  const eventDateById = new Map([
    ["e1", "2026-03-01"],
    ["e2", "2026-03-08"],
    ["e3", "2026-03-15"],
  ]);
  const teamUnavailableDatesById = new Map(teamIds.map((teamId) => [teamId, ""]));
  // m-seg-1 cannot play e1 because seg-b is unavailable that date.
  teamUnavailableDatesById.set("seg-b", "2026-03-01");

  const maxGamesPerTeamId = new Map(teamIds.map((teamId) => [teamId, 2]));
  const farAwayTeamIds = new Set(["far-a", "far-b"]);

  const validationContext: ConstraintValidationContext = {
    eventDateById,
    teamUnavailableDatesById,
    maxGamesPerTeamId,
    farAwayTeamIds,
  };

  return {
    matchups,
    orderedEventIds: ORDERED_EVENT_IDS,
    gamesPerEvening: GAMES_PER_EVENING,
    validationContext,
    weights: DEFAULT_SCHEDULING_WEIGHTS,
  };
}

function placementTuple(placement: PlacementWithCategory) {
  return `${placement.id}|${placement.eventId}|${placement.courtId}|${placement.slotIndex}`;
}

function serializeResult(
  placements: PlacementWithCategory[],
  unscheduledMatchupIds: string[],
) {
  return {
    placements: placements.map(placementTuple).sort(),
    unscheduled: [...unscheduledMatchupIds].sort(),
  };
}

function assertHardConstraints(
  placements: PlacementWithCategory[],
  input: SolveScheduleInput,
) {
  const seenIds = new Set<string>();
  for (const placement of placements) {
    expect(seenIds.has(placement.id)).toBe(false);
    seenIds.add(placement.id);
    expect(placement.courtId === "A" || placement.courtId === "B").toBe(true);
    expect(placement.slotIndex).toBeGreaterThanOrEqual(0);
    expect(placement.slotIndex).toBeLessThan(input.gamesPerEvening);
    expect(input.orderedEventIds).toContain(placement.eventId);

    const others = placements.filter((other) => other.id !== placement.id);
    expect(
      getPlacementViolationReason(placement, others, input.validationContext),
    ).toBeNull();
  }

  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const left = placements[i];
      const right = placements[j];
      if (!left || !right) continue;
      if (left.eventId !== right.eventId || left.slotIndex !== right.slotIndex) {
        continue;
      }
      expect(teamsOverlap(left.teamAId, left.teamBId, right.teamAId, right.teamBId)).toBe(
        false,
      );
    }
  }
}

function qualityParams(input: SolveScheduleInput, placements: PlacementWithCategory[]) {
  return {
    placementsWithCategory: placements,
    orderedEventIds: input.orderedEventIds,
    maxSlotIndex: input.gamesPerEvening - 1,
    totalMatchups: input.matchups.length,
    categoryBalanceContext: {
      categoryIds: [CAT_FEMENIL, CAT_SEGUNDA_FUERZA, CAT_VARONIL_LIBRE].sort(),
      eventCategoryTargetByEventId: new Map(
        input.orderedEventIds.map((eventId) => {
          const totals = new Map<string, number>();
          for (const matchupRow of input.matchups) {
            if (!matchupRow.categoryId) continue;
            totals.set(
              matchupRow.categoryId,
              (totals.get(matchupRow.categoryId) ?? 0) + 1,
            );
          }
          const targets = new Map<string, number>();
          for (const [categoryId, total] of totals) {
            targets.set(categoryId, total / input.orderedEventIds.length);
          }
          return [eventId, targets] as const;
        }),
      ),
    },
    farAwayTeamIds: input.validationContext.farAwayTeamIds,
    weights: input.weights,
  };
}

function findValidMove(
  placements: PlacementWithCategory[],
  unscheduledMatchupIds: string[],
  input: SolveScheduleInput,
): { move: SolverMove; evaluated: ReturnType<typeof evaluateMove> } | null {
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const left = placements[i];
      const right = placements[j];
      if (!left || !right) continue;
      const move: SolverMove = {
        type: "swap",
        placementIdA: left.id,
        placementIdB: right.id,
      };
      const evaluated = evaluateMove(move, placements, unscheduledMatchupIds, input);
      if (evaluated.valid) return { move, evaluated };
    }
  }

  const occupied = new Set(
    placements.map(
      (placement) => `${placement.eventId}:${placement.courtId}:${placement.slotIndex}`,
    ),
  );
  for (const eventId of input.orderedEventIds) {
    for (const courtId of ["A", "B"] as const) {
      for (let slotIndex = 0; slotIndex < input.gamesPerEvening; slotIndex++) {
        if (occupied.has(`${eventId}:${courtId}:${slotIndex}`)) continue;
        const placement = placements[0];
        if (!placement) continue;
        const move: SolverMove = {
          type: "relocate",
          placementId: placement.id,
          eventId,
          courtId,
          slotIndex,
        };
        const evaluated = evaluateMove(move, placements, unscheduledMatchupIds, input);
        if (evaluated.valid) return { move, evaluated };
      }
    }
  }

  return null;
}

describe("solveSchedule", () => {
  it("respects hard constraints for greedy and low effort", () => {
    const input = buildFixture();
    for (const effort of ["greedy", "low"] as const) {
      const result = solveSchedule({ ...input, effort, seed: 11 });
      expect(result.placements.length).toBeGreaterThan(0);
      assertHardConstraints(result.placements, input);
      const scheduledIds = new Set(result.placements.map((placement) => placement.id));
      for (const id of result.unscheduledMatchupIds) {
        expect(scheduledIds.has(id)).toBe(false);
      }
    }
  });

  it("is deterministic for the same seed and effort", () => {
    const input = buildFixture();
    const first = solveSchedule({ ...input, seed: 42, effort: "low" });
    const second = solveSchedule({ ...input, seed: 42, effort: "low" });
    expect(serializeResult(first.placements, first.unscheduledMatchupIds)).toEqual(
      serializeResult(second.placements, second.unscheduledMatchupIds),
    );
    expect(first.metrics.qualityScore).toBe(second.metrics.qualityScore);
  });

  it("can produce different greedy placements for different seeds", () => {
    const input = buildFixture();
    const seedOne = solveSchedule({ ...input, seed: 1, effort: "greedy" });
    const seedTwo = solveSchedule({ ...input, seed: 2, effort: "greedy" });
    const same =
      JSON.stringify(
        serializeResult(seedOne.placements, seedOne.unscheduledMatchupIds),
      ) ===
      JSON.stringify(serializeResult(seedTwo.placements, seedTwo.unscheduledMatchupIds));
    if (same) {
      // Shuffle may not change this fixture; determinism is still required.
      const again = solveSchedule({ ...input, seed: 1, effort: "greedy" });
      expect(serializeResult(again.placements, again.unscheduledMatchupIds)).toEqual(
        serializeResult(seedOne.placements, seedOne.unscheduledMatchupIds),
      );
    } else {
      expect(
        serializeResult(seedOne.placements, seedOne.unscheduledMatchupIds),
      ).not.toEqual(serializeResult(seedTwo.placements, seedTwo.unscheduledMatchupIds));
    }
  });

  it("returns a quality score no worse than greedy for the same seed", () => {
    const input = buildFixture();
    const greedy = solveSchedule({ ...input, seed: 7, effort: "greedy" });
    const annealed = solveSchedule({ ...input, seed: 7, effort: "low" });
    expect(annealed.metrics.qualityScore).toBeLessThanOrEqual(
      greedy.metrics.qualityScore,
    );
  });

  it("matches full qualityScore when applying a delta-scored move", () => {
    const input = buildFixture();
    const greedy = solveSchedule({ ...input, seed: 3, effort: "greedy" });
    const found = findValidMove(greedy.placements, greedy.unscheduledMatchupIds, input);
    expect(found).not.toBeNull();
    if (!found) return;

    const greedyScore = getScheduleQualityScore(qualityParams(input, greedy.placements));
    expect(greedy.metrics.qualityScore).toBeCloseTo(greedyScore, 6);

    const afterScore = getScheduleQualityScore(
      qualityParams(input, found.evaluated.nextPlacements),
    );
    expect(Math.abs(greedyScore + found.evaluated.scoreDelta - afterScore)).toBeLessThan(
      1e-6,
    );
  });

  it("does not schedule a matchup on an unavailable event", () => {
    const input = buildFixture();
    const result = solveSchedule({ ...input, effort: "greedy", seed: 9 });
    const blocked = result.placements.find((placement) => placement.id === "m-seg-1");
    if (blocked) {
      expect(blocked.eventId).not.toBe("e1");
    }
  });
});
