import { describe, expect, it } from "vitest";

import {
  getPosicionesSeasonOptions,
  selectDefaultPosicionesSeasonId,
} from "./public-standings-seasons";

const season = (id: string, state: string, startDate = "2026-01-01") => ({
  id,
  name: id,
  state,
  startDate,
  endDate: "2026-06-01",
});

describe("public standings seasons", () => {
  it("prefers the active season as the default posiciones target", () => {
    const context = {
      competitionSeason: season("active", "active", "2026-08-01"),
      completedSeasons: [season("old", "completed", "2026-01-01")],
    };

    expect(selectDefaultPosicionesSeasonId(context)).toBe("active");
    expect(getPosicionesSeasonOptions(context).map((s) => s.id)).toEqual([
      "active",
      "old",
    ]);
  });

  it("falls back to the newest completed season when nothing is active", () => {
    const context = {
      competitionSeason: season("latest", "completed", "2026-01-01"),
      completedSeasons: [
        season("latest", "completed", "2026-01-01"),
        season("older", "completed", "2025-01-01"),
      ],
    };

    expect(selectDefaultPosicionesSeasonId(context)).toBe("latest");
    expect(getPosicionesSeasonOptions(context).map((s) => s.id)).toEqual([
      "latest",
      "older",
    ]);
  });

  it("returns null when there are no public standings seasons", () => {
    const context = {
      competitionSeason: null,
      completedSeasons: [],
    };

    expect(selectDefaultPosicionesSeasonId(context)).toBeNull();
    expect(getPosicionesSeasonOptions(context)).toEqual([]);
  });
});
