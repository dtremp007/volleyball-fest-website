import { describe, expect, it } from "vitest";

import {
  buildScheduleBuilderStateResponse,
  computePlacementRevision,
  mapSnapshotToSaveInput,
  toScheduleBuilderMatchup,
} from "./builder-state";

const baseTeamA = {
  id: "team-a",
  name: "Team A",
  logoUrl: "/a.png",
  unavailableDates: "",
  isFarAway: false,
};

const baseTeamB = {
  id: "team-b",
  name: "Team B",
  logoUrl: "/b.png",
  unavailableDates: "2026-06-01",
  isFarAway: true,
};

function dbMatchup(
  overrides: Partial<{
    id: string;
    eventId: string | null;
    courtId: string | null;
    slotIndex: number | null;
    category: string;
    duration: number;
  }> = {},
) {
  return {
    id: "m1",
    seasonId: "season-1",
    category: "Open",
    eventId: null,
    courtId: null,
    slotIndex: null,
    duration: 45,
    bestOf: 3,
    sets: [],
    teamASetsWon: 0,
    teamBSetsWon: 0,
    hasScores: false,
    teamA: baseTeamA,
    teamB: baseTeamB,
    ...overrides,
  };
}

describe("toScheduleBuilderMatchup", () => {
  it("copies category onto both teams", () => {
    const matchup = toScheduleBuilderMatchup(dbMatchup({ category: "Femenil" }));
    expect(matchup.teamA.category).toBe("Femenil");
    expect(matchup.teamB.category).toBe("Femenil");
    expect(matchup.category).toBe("Femenil");
  });
});

describe("computePlacementRevision", () => {
  it("changes when placement changes", () => {
    const before = computePlacementRevision([dbMatchup()]);
    const after = computePlacementRevision([
      dbMatchup({ eventId: "e1", courtId: "A", slotIndex: 0 }),
    ]);
    expect(before).not.toBe(after);
  });

  it("is stable for the same placements", () => {
    const placements = [
      dbMatchup({ id: "m2", eventId: "e1", courtId: "B", slotIndex: 1 }),
      dbMatchup({ id: "m1", eventId: "e1", courtId: "A", slotIndex: 0 }),
    ];
    expect(computePlacementRevision(placements)).toBe(
      computePlacementRevision([...placements]),
    );
  });
});

describe("buildScheduleBuilderStateResponse", () => {
  it("nests scheduled matchups by event and court", () => {
    const response = buildScheduleBuilderStateResponse(
      [
        dbMatchup({ id: "m1", eventId: "e1", courtId: "A", slotIndex: 1 }),
        dbMatchup({ id: "m2", eventId: "e1", courtId: "A", slotIndex: 0 }),
        dbMatchup({ id: "m3" }),
      ],
      [{ id: "e1", name: "Jun 1", date: "2026-06-01", seasonId: "season-1" }],
    );

    expect(response.hasMatchups).toBe(true);
    expect(response.unscheduledMatchups).toHaveLength(1);
    expect(response.events[0].courts[0].matchups.map((m) => m.id)).toEqual(["m2", "m1"]);
    expect(response.matchupsByCategory.Open).toHaveLength(3);
  });

  it("reports hasMatchups false when empty", () => {
    const response = buildScheduleBuilderStateResponse([], []);
    expect(response.hasMatchups).toBe(false);
    expect(response.revision).toBe("");
  });
});

describe("mapSnapshotToSaveInput", () => {
  it("flattens nested courts to slot indices", () => {
    const snapshot = buildScheduleBuilderStateResponse(
      [
        dbMatchup({ id: "m1", eventId: "e1", courtId: "A", slotIndex: 0 }),
        dbMatchup({ id: "m2" }),
      ],
      [{ id: "e1", name: "Jun 1", date: "2026-06-01", seasonId: "season-1" }],
    );

    const input = mapSnapshotToSaveInput("season-1", {
      events: snapshot.events,
      unscheduledMatchups: snapshot.unscheduledMatchups,
    });

    expect(input.seasonId).toBe("season-1");
    expect(input.events).toEqual([{ id: "e1", name: "Jun 1", date: "2026-06-01 16:15" }]);
    expect(input.matchups).toEqual(
      expect.arrayContaining([
        { id: "m1", eventId: "e1", courtId: "A", slotIndex: 0 },
        { id: "m2", eventId: null, courtId: null, slotIndex: null },
      ]),
    );
  });
});
