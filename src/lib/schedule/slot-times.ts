/** Default game-night start (4:15 PM) until slotConfig is wired from scheduleConfig. */
export const DEFAULT_SLOT_START_HOUR = 16;
export const DEFAULT_SLOT_START_MINUTE = 15;
export const DEFAULT_SLOT_DURATION_MINUTES = 45;

export type SlotTimeConfig = {
  startHour: number;
  startMinute: number;
  slotDurationMinutes: number;
};

export const DEFAULT_SLOT_TIME_CONFIG: SlotTimeConfig = {
  startHour: DEFAULT_SLOT_START_HOUR,
  startMinute: DEFAULT_SLOT_START_MINUTE,
  slotDurationMinutes: DEFAULT_SLOT_DURATION_MINUTES,
};

export function getDatePart(dateTime: string): string {
  return dateTime.split(/[T ]/)[0]?.trim() ?? "";
}

export function getTimePart(dateTime: string): string {
  const timePart = dateTime.split(/[T ]/)[1]?.trim();
  if (!timePart) {
    return `${DEFAULT_SLOT_START_HOUR.toString().padStart(2, "0")}:${DEFAULT_SLOT_START_MINUTE.toString().padStart(2, "0")}`;
  }

  const [hour = "00", minute = "00"] = timePart.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function combineDateAndTime(date: string, time: string): string {
  return `${date} ${time}`;
}

export function getSlotTimeConfigForEvent(
  eventStartTime: string,
  slotDurationMinutes = DEFAULT_SLOT_DURATION_MINUTES,
): SlotTimeConfig {
  const [hour = "", minute = ""] = getTimePart(eventStartTime).split(":");
  const startHour = Number.parseInt(hour, 10);
  const startMinute = Number.parseInt(minute, 10);

  if (
    Number.isNaN(startHour) ||
    Number.isNaN(startMinute) ||
    startHour < 0 ||
    startHour > 23 ||
    startMinute < 0 ||
    startMinute > 59
  ) {
    return { ...DEFAULT_SLOT_TIME_CONFIG, slotDurationMinutes };
  }

  return { startHour, startMinute, slotDurationMinutes };
}

export function formatEventDateForDisplay(dateTime: string): Date {
  const date = getDatePart(dateTime);
  const [year, month, day] = date.split("-").map((part) => Number.parseInt(part, 10));

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return new Date(Number.NaN);
  }

  return new Date(year, month - 1, day, 12);
}

export function formatSlotTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

export function getTimeForSlotIndex(
  slotIndex: number,
  config: SlotTimeConfig = DEFAULT_SLOT_TIME_CONFIG,
): string {
  const totalMinutes =
    config.startHour * 60 + config.startMinute + slotIndex * config.slotDurationMinutes;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return formatSlotTime(hour, minute);
}

export function getTimeForSlotIndexWithDurations(
  slotIndex: number,
  slotDurations: Map<number, number>,
  config: SlotTimeConfig = DEFAULT_SLOT_TIME_CONFIG,
): string {
  let elapsedMinutes = 0;

  for (let index = 0; index < slotIndex; index++) {
    elapsedMinutes += slotDurations.get(index) ?? config.slotDurationMinutes;
  }

  const totalMinutes = config.startHour * 60 + config.startMinute + elapsedMinutes;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return formatSlotTime(hour, minute);
}

export function getSlotDurationsByIndex(
  matchups: { slotIndex: number | null; duration?: number | null }[],
  fallbackDurationMinutes = DEFAULT_SLOT_DURATION_MINUTES,
): Map<number, number> {
  const durations = new Map<number, number>();

  for (const matchup of matchups) {
    if (matchup.slotIndex === null) continue;
    const duration =
      typeof matchup.duration === "number" && matchup.duration > 0
        ? matchup.duration
        : fallbackDurationMinutes;
    const currentDuration = durations.get(matchup.slotIndex) ?? fallbackDurationMinutes;
    durations.set(matchup.slotIndex, Math.max(currentDuration, duration));
  }

  return durations;
}
