import { describe, expect, it } from "vitest";

import { getTimeForSlotIndex } from "./slot-times";

describe("getTimeForSlotIndex", () => {
  it("formats the default start time for slot 0", () => {
    expect(getTimeForSlotIndex(0)).toBe("4:15 PM");
  });

  it("advances by the default slot duration", () => {
    expect(getTimeForSlotIndex(1)).toBe("5:00 PM");
  });
});
