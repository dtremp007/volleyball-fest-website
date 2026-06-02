import { describe, expect, it } from "vitest";

import {
  formatEventDateForDisplay,
  getSlotDurationsByIndex,
  getSlotTimeConfigForEvent,
  getTimeForSlotIndex,
  getTimeForSlotIndexWithDurations,
} from "./slot-times";

describe("getTimeForSlotIndex", () => {
  it("formats the default start time for slot 0", () => {
    expect(getTimeForSlotIndex(0)).toBe("4:15 PM");
  });

  it("advances by the default slot duration", () => {
    expect(getTimeForSlotIndex(1)).toBe("5:00 PM");
  });

  it("uses an event-specific start time when provided", () => {
    const config = getSlotTimeConfigForEvent("2026-06-06 17:00");

    expect(getTimeForSlotIndex(0, config)).toBe("5:00 PM");
    expect(getTimeForSlotIndex(1, config)).toBe("5:45 PM");
  });

  it("advances by previous slot durations", () => {
    const config = getSlotTimeConfigForEvent("2026-06-06 16:15");
    const slotDurations = new Map([
      [0, 60],
      [1, 45],
    ]);

    expect(getTimeForSlotIndexWithDurations(0, slotDurations, config)).toBe("4:15 PM");
    expect(getTimeForSlotIndexWithDurations(1, slotDurations, config)).toBe("5:15 PM");
    expect(getTimeForSlotIndexWithDurations(2, slotDurations, config)).toBe("6:00 PM");
  });

  it("uses the longest matchup duration for each shared court slot", () => {
    const durations = getSlotDurationsByIndex([
      { slotIndex: 0, duration: 45 },
      { slotIndex: 0, duration: 60 },
      { slotIndex: 1, duration: 45 },
    ]);

    expect(durations.get(0)).toBe(60);
    expect(durations.get(1)).toBe(45);
  });

  it("falls back to the default start time for date-only events", () => {
    const config = getSlotTimeConfigForEvent("2026-06-06");

    expect(getTimeForSlotIndex(0, config)).toBe("4:15 PM");
  });

  it("formats event dates from date parts without using the time portion", () => {
    expect(formatEventDateForDisplay("2026-06-06 16:15").getFullYear()).toBe(2026);
    expect(formatEventDateForDisplay("2026-06-06 16:15").getMonth()).toBe(5);
    expect(formatEventDateForDisplay("2026-06-06 16:15").getDate()).toBe(6);
  });
});
