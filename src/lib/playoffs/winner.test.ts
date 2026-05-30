import { describe, expect, it } from "vitest";

import { calculatePlayoffWinner } from "./winner";

const teams = [{ teamId: "team-a" }, { teamId: "team-b" }];

describe("calculatePlayoffWinner", () => {
  it("returns the winner once a best-of-1 matchup has one set winner", () => {
    expect(
      calculatePlayoffWinner({
        bestOf: 1,
        teams,
        points: [
          { teamId: "team-a", set: 1, points: 25 },
          { teamId: "team-b", set: 1, points: 22 },
        ],
      }),
    ).toMatchObject({
      winnerTeamId: "team-a",
      loserTeamId: "team-b",
      teamSetsWon: { "team-a": 1, "team-b": 0 },
    });
  });

  it("returns the winner after two set wins in a best-of-3 matchup", () => {
    expect(
      calculatePlayoffWinner({
        bestOf: 3,
        teams,
        points: [
          { teamId: "team-a", set: 1, points: 25 },
          { teamId: "team-b", set: 1, points: 18 },
          { teamId: "team-a", set: 2, points: 22 },
          { teamId: "team-b", set: 2, points: 25 },
          { teamId: "team-a", set: 3, points: 15 },
          { teamId: "team-b", set: 3, points: 11 },
        ],
      })?.winnerTeamId,
    ).toBe("team-a");
  });

  it("returns null when the matchup is incomplete", () => {
    expect(
      calculatePlayoffWinner({
        bestOf: 3,
        teams,
        points: [
          { teamId: "team-a", set: 1, points: 25 },
          { teamId: "team-b", set: 1, points: 18 },
        ],
      }),
    ).toBeNull();
  });

  it("returns null when a team is still unknown", () => {
    expect(
      calculatePlayoffWinner({
        bestOf: 1,
        teams: [{ teamId: "team-a" }, { teamId: null }],
        points: [
          { teamId: "team-a", set: 1, points: 25 },
          { teamId: "team-b", set: 1, points: 18 },
        ],
      }),
    ).toBeNull();
  });
});
