import { describe, expect, it } from "vitest";

import {
  buildCategoryRankById,
  DEFAULT_SCHEDULING_WEIGHTS,
  getPlacementViolationReason,
  getScheduleQualityScore,
  teamsOverlap,
  type ConstraintValidationContext,
  type PlacementWithCategory,
} from "~/lib/db/queries/schedule-algorithm";
import { unorderedTeamPairKey } from "~/lib/schedule/matchup-pair";
import {
  SATURDAY_SCHEDULE_TEMPLATE,
  WEEKDAY_SCHEDULE_TEMPLATE,
} from "~/lib/schedule/weekday-templates";
import {
  evaluateMove,
  solveSchedule,
  type SolverMove,
  type SolveScheduleInput,
  type SolveScheduleMatchup,
} from "~/lib/scheduling/solver";

const CAT_EARLY = "cat-early";
const CAT_MID = "cat-mid";
const CAT_LATE = "cat-late";
const ORDERED_CATEGORY_IDS = [CAT_EARLY, CAT_MID, CAT_LATE];
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
    matchup("m-early-1", "early-a", "early-b", CAT_EARLY),
    matchup("m-early-2", "early-c", "early-d", CAT_EARLY),
    matchup("m-early-3", "early-a", "early-c", CAT_EARLY),
    matchup("m-late-1", "late-a", "late-b", CAT_LATE),
    matchup("m-late-2", "late-c", "late-d", CAT_LATE),
    matchup("m-mid-1", "mid-a", "mid-b", CAT_MID),
    matchup("m-far-1", "far-a", "far-b", CAT_MID),
    matchup("m-far-2", "far-a", "mid-a", CAT_MID),
  ];

  const teamIds = [
    "early-a",
    "early-b",
    "early-c",
    "early-d",
    "late-a",
    "late-b",
    "late-c",
    "late-d",
    "mid-a",
    "mid-b",
    "far-a",
    "far-b",
  ];

  const eventDateById = new Map([
    ["e1", "2026-03-01"],
    ["e2", "2026-03-08"],
    ["e3", "2026-03-15"],
  ]);
  const teamUnavailableDatesById = new Map(teamIds.map((teamId) => [teamId, ""]));
  // m-mid-1 cannot play e1 because mid-b is unavailable that date.
  teamUnavailableDatesById.set("mid-b", "2026-03-01");

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
    orderedCategoryIds: ORDERED_CATEGORY_IDS,
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

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

  const pairsByEvent = new Map<string, Set<string>>();
  for (const placement of placements) {
    const pairKey = unorderedTeamPairKey(placement.teamAId, placement.teamBId);
    const seen = pairsByEvent.get(placement.eventId) ?? new Set<string>();
    expect(seen.has(pairKey)).toBe(false);
    seen.add(pairKey);
    pairsByEvent.set(placement.eventId, seen);
  }
}

function qualityParams(input: SolveScheduleInput, placements: PlacementWithCategory[]) {
  return {
    placementsWithCategory: placements,
    orderedEventIds: input.orderedEventIds,
    maxSlotIndex: input.gamesPerEvening - 1,
    totalMatchups: input.matchups.length,
    categoryBalanceContext: {
      categoryIds: [...ORDERED_CATEGORY_IDS].sort(),
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
    categoryRankById: buildCategoryRankById(input.orderedCategoryIds),
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
      expect(result.metrics.hardConflictCount).toBe(0);
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
    const blocked = result.placements.find((placement) => placement.id === "m-mid-1");
    if (blocked) {
      expect(blocked.eventId).not.toBe("e1");
    }
  });

  it("schedules earlier-ordered categories in earlier slots than later-ordered ones", () => {
    const input = buildFixture();
    const result = solveSchedule({ ...input, effort: "low", seed: 5 });
    const earlySlots = result.placements
      .filter((placement) => placement.categoryId === CAT_EARLY)
      .map((placement) => placement.slotIndex);
    const lateSlots = result.placements
      .filter((placement) => placement.categoryId === CAT_LATE)
      .map((placement) => placement.slotIndex);

    expect(earlySlots.length).toBeGreaterThan(0);
    expect(lateSlots.length).toBeGreaterThan(0);
    expect(average(earlySlots)).toBeLessThanOrEqual(average(lateSlots));
  });

  it("clusters a category onto one court within an event when clustering is strong", () => {
    const input = buildFixture();
    input.weights = {
      ...input.weights,
      categoryCourtClustering: 40,
      categoryDistributionRun: 0,
    };
    const result = solveSchedule({ ...input, effort: "low", seed: 13 });

    const courtsByEventAndCategory = new Map<string, Set<string>>();
    for (const placement of result.placements) {
      if (!placement.categoryId) continue;
      const key = `${placement.eventId}:${placement.categoryId}`;
      const courts = courtsByEventAndCategory.get(key) ?? new Set<string>();
      courts.add(placement.courtId);
      courtsByEventAndCategory.set(key, courts);
    }

    const splitCategories = [...courtsByEventAndCategory.values()].filter(
      (courts) => courts.size > 1,
    );
    expect(splitCategories.length).toBeLessThanOrEqual(1);
  });

  it("does not place weekday events past weekday slot count when Saturday events have more", () => {
    const weekdayEventId = "weekday";
    const saturdayEventId = "saturday";
    const matchups: SolveScheduleMatchup[] = [];
    const teamIds: string[] = [];

    for (let i = 0; i < 20; i++) {
      const teamAId = `t${i * 2}`;
      const teamBId = `t${i * 2 + 1}`;
      teamIds.push(teamAId, teamBId);
      matchups.push(
        matchup(`m-${i}`, teamAId, teamBId, i % 2 === 0 ? CAT_EARLY : CAT_LATE),
      );
    }

    const input: SolveScheduleInput = {
      matchups,
      orderedEventIds: [weekdayEventId, saturdayEventId],
      orderedCategoryIds: ORDERED_CATEGORY_IDS,
      gamesPerEvening: SATURDAY_SCHEDULE_TEMPLATE.gamesPerEvening,
      gamesPerEveningByEventId: {
        [weekdayEventId]: WEEKDAY_SCHEDULE_TEMPLATE.gamesPerEvening,
        [saturdayEventId]: SATURDAY_SCHEDULE_TEMPLATE.gamesPerEvening,
      },
      validationContext: {
        eventDateById: new Map([
          [weekdayEventId, "2026-08-14"],
          [saturdayEventId, "2026-08-15"],
        ]),
        teamUnavailableDatesById: new Map(teamIds.map((teamId) => [teamId, ""])),
        maxGamesPerTeamId: new Map(teamIds.map((teamId) => [teamId, 2])),
        farAwayTeamIds: new Set(),
      },
      weights: DEFAULT_SCHEDULING_WEIGHTS,
      effort: "greedy",
    };

    const result = solveSchedule(input);
    const weekdayPlacements = result.placements.filter(
      (placement) => placement.eventId === weekdayEventId,
    );
    const saturdayPlacements = result.placements.filter(
      (placement) => placement.eventId === saturdayEventId,
    );

    expect(weekdayPlacements.length).toBeGreaterThan(0);
    expect(saturdayPlacements.length).toBeGreaterThan(0);
    for (const placement of weekdayPlacements) {
      expect(placement.slotIndex).toBeLessThan(WEEKDAY_SCHEDULE_TEMPLATE.gamesPerEvening);
    }
    expect(
      saturdayPlacements.some(
        (placement) => placement.slotIndex >= WEEKDAY_SCHEDULE_TEMPLATE.gamesPerEvening,
      ),
    ).toBe(true);
  });

  it("does not schedule the same pair twice on one event", () => {
    const matchups = [
      matchup("m1", "a", "b", CAT_EARLY),
      matchup("m2", "b", "a", CAT_EARLY),
    ];
    const teamIds = ["a", "b"];
    const input: SolveScheduleInput = {
      matchups,
      orderedEventIds: ["e1", "e2"],
      orderedCategoryIds: ORDERED_CATEGORY_IDS,
      gamesPerEvening: 2,
      validationContext: {
        eventDateById: new Map([
          ["e1", "2026-03-01"],
          ["e2", "2026-03-08"],
        ]),
        teamUnavailableDatesById: new Map(teamIds.map((id) => [id, ""])),
        maxGamesPerTeamId: new Map(teamIds.map((id) => [id, 2])),
        farAwayTeamIds: new Set(),
      },
      weights: DEFAULT_SCHEDULING_WEIGHTS,
      effort: "greedy",
      seed: 1,
    };

    const result = solveSchedule(input);
    expect(result.placements).toHaveLength(2);
    expect(result.placements[0]?.eventId).not.toBe(result.placements[1]?.eventId);
    assertHardConstraints(result.placements, input);
  });
});

describe("getPlacementViolationReason", () => {
  const context: ConstraintValidationContext = {
    eventDateById: new Map([
      ["e1", "2026-03-01"],
      ["e2", "2026-03-08"],
    ]),
    teamUnavailableDatesById: new Map([
      ["a", ""],
      ["b", ""],
    ]),
    maxGamesPerTeamId: new Map([
      ["a", 2],
      ["b", 2],
    ]),
    farAwayTeamIds: new Set(),
  };

  it("rejects the same unordered pair on the same event", () => {
    const existing = [
      {
        id: "m1",
        teamAId: "a",
        teamBId: "b",
        eventId: "e1",
        courtId: "A" as const,
        slotIndex: 0,
      },
    ];
    const candidate = {
      id: "m2",
      teamAId: "b",
      teamBId: "a",
      eventId: "e1",
      courtId: "B" as const,
      slotIndex: 1,
    };

    expect(getPlacementViolationReason(candidate, existing, context)).toBe(
      "These two teams already play each other at this event.",
    );
  });

  it("allows the same pair on a different event", () => {
    const existing = [
      {
        id: "m1",
        teamAId: "a",
        teamBId: "b",
        eventId: "e1",
        courtId: "A" as const,
        slotIndex: 0,
      },
    ];
    const candidate = {
      id: "m2",
      teamAId: "b",
      teamBId: "a",
      eventId: "e2",
      courtId: "A" as const,
      slotIndex: 0,
    };

    expect(getPlacementViolationReason(candidate, existing, context)).toBeNull();
  });
});
