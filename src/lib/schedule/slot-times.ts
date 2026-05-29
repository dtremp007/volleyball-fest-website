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
    config.startHour * 60 +
    config.startMinute +
    slotIndex * config.slotDurationMinutes;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return formatSlotTime(hour, minute);
}
