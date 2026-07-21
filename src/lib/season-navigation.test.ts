import { describe, expect, it } from "vitest";
import { getSeasonSwitchTarget, selectAdminEntrySeason } from "./season-navigation";

const seasons = [
  { id: "old", state: "completed", startDate: "2026-01-01" },
  { id: "next", state: "draft", startDate: "2027-01-01" },
  { id: "current", state: "active", startDate: "2026-08-01" },
];

describe("season navigation", () => {
  it("preserves known workflow sections", () => {
    expect(getSeasonSwitchTarget("/seasons/current/teams", "current", "next")).toBe(
      "/seasons/next/teams",
    );
    expect(
      getSeasonSwitchTarget("/seasons/current/playoffs/scorecard", "current", "next"),
    ).toBe("/seasons/next/playoffs/scorecard");
  });

  it("falls back to overview for an unknown season section", () => {
    expect(getSeasonSwitchTarget("/seasons/current/unknown", "current", "next")).toBe(
      "/seasons/next",
    );
  });

  it("uses a valid saved season then the newest operational season", () => {
    expect(selectAdminEntrySeason(seasons, "old")?.id).toBe("old");
    expect(selectAdminEntrySeason(seasons, "missing")?.id).toBe("next");
  });
});
