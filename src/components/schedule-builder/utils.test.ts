import { describe, expect, it } from "vitest";
import type { Matchup, ScheduleEvent } from "./types";
import { movesScoredMatchup, sortEventsByDate } from "./utils";

const team = (id: string) => ({ id, name: id, logoUrl: "", category: "Varonil" });

const matchup = (id: string, hasScores = false): Matchup => ({
  id,
  category: "Varonil",
  teamA: team(`${id}-a`),
  teamB: team(`${id}-b`),
  hasScores,
});

const event = (id: string, date: string, courtA: Matchup[], courtB: Matchup[] = []) =>
  ({
    id,
    name: id,
    date,
    courts: [
      { id: "A", matchups: courtA },
      { id: "B", matchups: courtB },
    ],
  }) satisfies ScheduleEvent;

describe("sortEventsByDate", () => {
  it("places a new date between its neighbors", () => {
    const events = [
      event("oct7", "2026-10-07 19:00", []),
      event("oct21", "2026-10-21 19:00", []),
      event("oct14", "2026-10-14 19:00", []),
    ];
    expect(sortEventsByDate(events).map((e) => e.id)).toEqual(["oct7", "oct14", "oct21"]);
  });
});

describe("movesScoredMatchup", () => {
  const played = matchup("played", true);
  const open = matchup("open");

  it("allows moving unscored games around a played game", () => {
    const before = [event("e1", "2026-10-07 19:00", [played, open])];
    const after = [event("e1", "2026-10-07 19:00", [played], [open])];
    expect(movesScoredMatchup(before, after)).toBe(false);
  });

  it("refuses inserting a game above a played game", () => {
    const before = [event("e1", "2026-10-07 19:00", [played], [open])];
    const after = [event("e1", "2026-10-07 19:00", [open, played])];
    expect(movesScoredMatchup(before, after)).toBe(true);
  });

  it("refuses unscheduling a played game", () => {
    const before = [event("e1", "2026-10-07 19:00", [played])];
    const after = [event("e1", "2026-10-07 19:00", [])];
    expect(movesScoredMatchup(before, after)).toBe(true);
  });
});
