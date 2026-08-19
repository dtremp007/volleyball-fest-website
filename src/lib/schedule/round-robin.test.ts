import { describe, expect, it } from "vitest";
import { generatePairsForGamesPerTeam } from "./round-robin";

function gamesPerTeamCounts(
  teamIds: string[],
  pairs: { teamAId: string; teamBId: string }[],
) {
  const counts = new Map(teamIds.map((id) => [id, 0]));
  for (const pair of pairs) {
    counts.set(pair.teamAId, (counts.get(pair.teamAId) ?? 0) + 1);
    counts.set(pair.teamBId, (counts.get(pair.teamBId) ?? 0) + 1);
  }
  return [...counts.values()];
}

describe("generatePairsForGamesPerTeam", () => {
  it("returns no pairs for fewer than two teams", () => {
    expect(generatePairsForGamesPerTeam(["a"], 4)).toEqual([]);
    expect(generatePairsForGamesPerTeam([], 4)).toEqual([]);
  });

  it("builds a complete round-robin by default degree", () => {
    const teams = ["a", "b", "c"];
    const pairs = generatePairsForGamesPerTeam(teams, 2);
    expect(pairs).toHaveLength(3);
    expect(gamesPerTeamCounts(teams, pairs)).toEqual([2, 2, 2]);
  });

  it("builds a partial round-robin for 14 teams playing 10 games", () => {
    const teams = Array.from({ length: 14 }, (_, i) => `t${i}`);
    const pairs = generatePairsForGamesPerTeam(teams, 10);
    expect(pairs).toHaveLength(70);
    expect(new Set(gamesPerTeamCounts(teams, pairs))).toEqual(new Set([10]));
  });

  it("adds rematches for 8 teams playing 10 games", () => {
    const teams = Array.from({ length: 8 }, (_, i) => `t${i}`);
    const pairs = generatePairsForGamesPerTeam(teams, 10);
    expect(pairs).toHaveLength(40);
    expect(new Set(gamesPerTeamCounts(teams, pairs))).toEqual(new Set([10]));
  });

  it("swaps sides on rematches", () => {
    expect(generatePairsForGamesPerTeam(["a", "b"], 2)).toEqual([
      { teamAId: "a", teamBId: "b" },
      { teamAId: "b", teamBId: "a" },
    ]);
  });

  it("keeps odd rosters regular when the degree is even", () => {
    const teams = ["a", "b", "c", "d", "e"];
    const pairs = generatePairsForGamesPerTeam(teams, 4);
    expect(pairs).toHaveLength(10);
    expect(new Set(gamesPerTeamCounts(teams, pairs))).toEqual(new Set([4]));
  });
});
