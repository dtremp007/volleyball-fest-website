import { formatEventDateForDisplay, getDatePart } from "./slot-times";

export type ScheduleWeekdayTemplate = {
  startTime: string;
  gamesPerEvening: number;
};

/** Mon–Fri (and Sunday): 7:00 PM, 4 slots. */
export const WEEKDAY_SCHEDULE_TEMPLATE: ScheduleWeekdayTemplate = {
  startTime: "19:00",
  gamesPerEvening: 4,
};

/** Saturday: 4:00 PM, 7 slots. */
export const SATURDAY_SCHEDULE_TEMPLATE: ScheduleWeekdayTemplate = {
  startTime: "16:00",
  gamesPerEvening: 7,
};

const SATURDAY_DAY_INDEX = 6;

export function getScheduleTemplateForDate(date: string): ScheduleWeekdayTemplate {
  const localDate = formatEventDateForDisplay(getDatePart(date) || date);
  if (Number.isNaN(localDate.getTime())) {
    return WEEKDAY_SCHEDULE_TEMPLATE;
  }
  if (localDate.getDay() === SATURDAY_DAY_INDEX) {
    return SATURDAY_SCHEDULE_TEMPLATE;
  }
  return WEEKDAY_SCHEDULE_TEMPLATE;
}

export function buildGamesPerEveningByEventId(
  events: Array<{ id: string; date: string }>,
): Record<string, number> {
  const byEventId: Record<string, number> = {};
  for (const event of events) {
    byEventId[event.id] = getScheduleTemplateForDate(event.date).gamesPerEvening;
  }
  return byEventId;
}
