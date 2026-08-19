import { describe, expect, it } from "vitest";
import {
  clampGamesPerTeam,
  defaultGamesPerTeam,
  isValidGamesPerTeam,
  matchupCountForGamesPerTeam,
  maxGamesPerTeam,
  minGamesPerTeam,
  nextGamesPerTeam,
  resolveStoredGamesPerTeam,
} from "./games-per-team";

describe("games per team", () => {
  it("defaults to a complete round-robin", () => {
    expect(defaultGamesPerTeam(8)).toBe(7);
    expect(defaultGamesPerTeam(14)).toBe(13);
    expect(defaultGamesPerTeam(1)).toBe(0);
  });

  it("requires an even team-games product", () => {
    expect(isValidGamesPerTeam(8, 10)).toBe(true);
    expect(isValidGamesPerTeam(14, 10)).toBe(true);
    expect(isValidGamesPerTeam(5, 3)).toBe(false);
    expect(minGamesPerTeam(5)).toBe(2);
    expect(minGamesPerTeam(8)).toBe(1);
  });

  it("skips invalid values when stepping", () => {
    expect(nextGamesPerTeam(5, 2, 1)).toBe(4);
    expect(nextGamesPerTeam(5, 4, -1)).toBe(2);
  });

  it("clamps to the 3x complete-round-robin cap", () => {
    expect(maxGamesPerTeam(8)).toBe(21);
    expect(clampGamesPerTeam(8, 99)).toBe(21);
    expect(clampGamesPerTeam(5, 3)).toBe(2);
  });

  it("derives from meetings-per-pair when nothing is stored", () => {
    expect(resolveStoredGamesPerTeam(8, 0, 1)).toBe(7);
    expect(resolveStoredGamesPerTeam(8, 0, 2)).toBe(14);
    expect(resolveStoredGamesPerTeam(8, 10, 1)).toBe(10);
  });

  it("computes matchup totals from the coach formula", () => {
    expect(matchupCountForGamesPerTeam(14, 10)).toBe(70);
    expect(matchupCountForGamesPerTeam(8, 10)).toBe(40);
  });
});
