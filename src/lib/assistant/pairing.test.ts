import { describe, expect, it } from "vitest";
import { missingRoundRobinPairs } from "./pairing";

describe("missingRoundRobinPairs", () => {
  it("returns a full single round-robin when nothing exists", () => {
    const missing = missingRoundRobinPairs(["a", "b", "c"], [], 1);
    expect(missing).toEqual([
      { teamAId: "a", teamBId: "b" },
      { teamAId: "a", teamBId: "c" },
      { teamAId: "b", teamBId: "c" },
    ]);
  });

  it("only fills pairs that are still short of the target", () => {
    const missing = missingRoundRobinPairs(
      ["a", "b", "c"],
      [{ teamAId: "a", teamBId: "b" }],
      1,
    );
    expect(missing).toEqual([
      { teamAId: "a", teamBId: "c" },
      { teamAId: "b", teamBId: "c" },
    ]);
  });

  it("adds a second meeting without deleting the first", () => {
    const existing = [
      { teamAId: "a", teamBId: "b" },
      { teamAId: "a", teamBId: "c" },
      { teamAId: "b", teamBId: "c" },
    ];
    const missing = missingRoundRobinPairs(["a", "b", "c"], existing, 2);
    expect(missing).toHaveLength(3);
    expect(missing).toEqual([
      { teamAId: "b", teamBId: "a" },
      { teamAId: "c", teamBId: "a" },
      { teamAId: "c", teamBId: "b" },
    ]);
  });

  it("returns nothing when the target is already met", () => {
    const existing = [
      { teamAId: "a", teamBId: "b" },
      { teamAId: "b", teamBId: "a" },
    ];
    expect(missingRoundRobinPairs(["a", "b"], existing, 2)).toEqual([]);
  });
});
