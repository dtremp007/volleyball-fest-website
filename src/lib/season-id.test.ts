import { describe, expect, it } from "vitest";
import { nextAvailableSeasonId, slugifySeasonId } from "./season-id";

describe("slugifySeasonId", () => {
  it("turns season names into readable ids", () => {
    expect(slugifySeasonId("Fall 2026")).toBe("fall-2026");
    expect(slugifySeasonId("Spring 2027")).toBe("spring-2027");
    expect(slugifySeasonId("  Summer  2025 ")).toBe("summer-2025");
  });

  it("strips accents and punctuation", () => {
    expect(slugifySeasonId("Temporada Otoño 2026!")).toBe("temporada-otono-2026");
  });
});

describe("nextAvailableSeasonId", () => {
  it("keeps the base id when free", () => {
    expect(nextAvailableSeasonId("fall-2026", ["spring-2026"])).toBe("fall-2026");
  });

  it("appends a numeric suffix when the base id is taken", () => {
    expect(nextAvailableSeasonId("fall-2026", ["fall-2026"])).toBe("fall-2026-2");
    expect(nextAvailableSeasonId("fall-2026", ["fall-2026", "fall-2026-2"])).toBe(
      "fall-2026-3",
    );
  });
});
