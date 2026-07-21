import { describe, expect, it } from "vitest";
import { selectPublicSeasonContext } from "./season";

describe("public season context", () => {
  it("splits competition and registration seasons by purpose", () => {
    const context = selectPublicSeasonContext([
      { id: "old", state: "completed" as const, startDate: "2026-01-01" },
      { id: "active", state: "active" as const, startDate: "2026-08-01" },
      { id: "signup", state: "signup_open" as const, startDate: "2027-02-01" },
    ]);

    expect(context.competitionSeason?.id).toBe("active");
    expect(context.registrationSeason?.id).toBe("signup");
    expect(context.completedSeasons.map((season) => season.id)).toEqual(["old"]);
  });

  it("falls back to the newest completed season and never guesses registration", () => {
    const context = selectPublicSeasonContext([
      { id: "older", state: "completed" as const, startDate: "2025-01-01" },
      { id: "latest", state: "completed" as const, startDate: "2026-01-01" },
      { id: "draft", state: "draft" as const, startDate: "2027-01-01" },
    ]);

    expect(context.competitionSeason?.id).toBe("latest");
    expect(context.registrationSeason).toBeNull();
    expect(context.completedSeasons.map((season) => season.id)).toEqual([
      "latest",
      "older",
    ]);
  });

  it("lists completed seasons newest first and excludes non-completed", () => {
    const context = selectPublicSeasonContext([
      { id: "a", state: "completed" as const, startDate: "2024-01-01" },
      { id: "b", state: "active" as const, startDate: "2025-06-01" },
      { id: "c", state: "completed" as const, startDate: "2025-01-01" },
      { id: "d", state: "signup_open" as const, startDate: "2026-01-01" },
    ]);

    expect(context.completedSeasons.map((season) => season.id)).toEqual(["c", "a"]);
  });
});
