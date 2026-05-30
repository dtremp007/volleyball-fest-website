import { describe, expect, it } from "vitest";

import {
  formatEventDateForDisplay,
  getSlotTimeConfigForEvent,
  getTimeForSlotIndex,
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
