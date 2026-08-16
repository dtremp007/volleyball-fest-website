import { describe, expect, it } from "vitest";
import { generateRoundRobinPairs } from "./round-robin";

describe("generateRoundRobinPairs", () => {
  it("emits each unordered pair once by default", () => {
    expect(generateRoundRobinPairs(["a", "b", "c"], 1)).toEqual([
      { teamAId: "a", teamBId: "b" },
      { teamAId: "a", teamBId: "c" },
      { teamAId: "b", teamBId: "c" },
    ]);
  });

  it("repeats pairs and swaps sides on the second meeting", () => {
    expect(generateRoundRobinPairs(["a", "b"], 2)).toEqual([
      { teamAId: "a", teamBId: "b" },
      { teamAId: "b", teamBId: "a" },
    ]);
  });

  it("returns no pairs for fewer than two teams", () => {
    expect(generateRoundRobinPairs(["a"], 2)).toEqual([]);
    expect(generateRoundRobinPairs([], 2)).toEqual([]);
  });
});
