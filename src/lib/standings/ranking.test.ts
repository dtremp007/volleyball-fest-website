import { describe, expect, it } from "vitest";

import {
  contributionFromFirstTwoSets,
  sortStandingsTeams,
  standingPct,
  type ProcessedStandingsMatch,
  type StandingsSortRow,
} from "./ranking";

describe("contributionFromFirstTwoSets", () => {
  it("counts 1–1 split by set wins (PRD example)", () => {
    const c = contributionFromFirstTwoSets([
      { set: 1, teamAScore: 25, teamBScore: 20 },
      { set: 2, teamAScore: 18, teamBScore: 25 },
    ]);
    expect(c).toEqual({ pfA: 43, pfB: 45, ptsA: 1, ptsB: 1 });
  });

  it("returns 2–0 win for A", () => {
    const c = contributionFromFirstTwoSets([
      { set: 1, teamAScore: 25, teamBScore: 10 },
      { set: 2, teamAScore: 25, teamBScore: 12 },
    ]);
    expect(c).toEqual({ pfA: 50, pfB: 22, ptsA: 2, ptsB: 0 });
  });

  it("returns null if set 2 missing", () => {
    expect(
      contributionFromFirstTwoSets([{ set: 1, teamAScore: 25, teamBScore: 20 }]),
    ).toBeNull();
  });

  it("returns null on tied set score", () => {
    expect(
      contributionFromFirstTwoSets([
        { set: 1, teamAScore: 25, teamBScore: 25 },
        { set: 2, teamAScore: 25, teamBScore: 20 },
      ]),
    ).toBeNull();
  });
});

describe("standingPct", () => {
  it("is PTS / (2 * P)", () => {
    expect(standingPct(4, 5)).toBeCloseTo(5 / 8);
    expect(standingPct(0, 0)).toBe(0);
  });
});

describe("sortStandingsTeams", () => {
  function row(
    teamId: string,
    pts: number,
    pd: number,
    pf: number,
  ): StandingsSortRow {
    return {
      teamId,
      standingsPoints: pts,
      pointDifferential: pd,
      pointsFor: pf,
    };
  }

  it("orders by PTS then PD then PF", () => {
    const teams = [row("a", 4, 0, 50), row("b", 6, -1, 40), row("c", 4, 5, 30)];
    const sorted = sortStandingsTeams(teams, []);
    expect(sorted.map((t) => t.teamId)).toEqual(["b", "c", "a"]);
  });

  it("uses head-to-head when PTS, PD, PF match", () => {
    const teams = [row("b", 4, 0, 50), row("a", 4, 0, 50)];
    const matches: ProcessedStandingsMatch[] = [
      {
        teamAId: "a",
        teamBId: "b",
        ptsA: 2,
        ptsB: 0,
        pfA: 50,
        pfB: 20,
      },
    ];
    const sorted = sortStandingsTeams(teams, matches);
    expect(sorted.map((t) => t.teamId)).toEqual(["a", "b"]);
  });

  it("breaks remaining ties by teamId", () => {
    const teams = [row("z", 2, 0, 40), row("m", 2, 0, 40)];
    const sorted = sortStandingsTeams(teams, []);
    expect(sorted.map((t) => t.teamId)).toEqual(["m", "z"]);
  });
});
