import { describe, expect, it } from "vitest";

import {
  SATURDAY_SCHEDULE_TEMPLATE,
  WEEKDAY_SCHEDULE_TEMPLATE,
  buildGamesPerEveningByEventId,
  getScheduleTemplateForDate,
} from "./weekday-templates";

describe("getScheduleTemplateForDate", () => {
  it("uses the weekday template for Monday through Friday", () => {
    expect(getScheduleTemplateForDate("2026-08-10")).toEqual(WEEKDAY_SCHEDULE_TEMPLATE); // Mon
    expect(getScheduleTemplateForDate("2026-08-14")).toEqual(WEEKDAY_SCHEDULE_TEMPLATE); // Fri
  });

  it("uses the Saturday template", () => {
    expect(getScheduleTemplateForDate("2026-08-15")).toEqual(SATURDAY_SCHEDULE_TEMPLATE);
  });

  it("uses the weekday template for Sunday", () => {
    expect(getScheduleTemplateForDate("2026-08-16")).toEqual(WEEKDAY_SCHEDULE_TEMPLATE);
  });

  it("reads the calendar date from a datetime string", () => {
    expect(getScheduleTemplateForDate("2026-08-15 16:15")).toEqual(
      SATURDAY_SCHEDULE_TEMPLATE,
    );
  });
});

describe("buildGamesPerEveningByEventId", () => {
  it("maps each event to its weekday slot count", () => {
    expect(
      buildGamesPerEveningByEventId([
        { id: "weekday", date: "2026-08-14 19:00" },
        { id: "saturday", date: "2026-08-15 16:15" },
      ]),
    ).toEqual({
      weekday: 4,
      saturday: 7,
    });
  });
});
