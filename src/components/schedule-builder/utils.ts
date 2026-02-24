import { v4 as uuidv4 } from "uuid";
import type { Matchup, ScheduleEvent, TimeSlot as TimeSlotData } from "./types";

export const START_HOUR = 16; // 4 PM
export const START_MINUTE = 15;
export const SLOT_DURATION_MINUTES = 45;
export const DEFAULT_SLOTS_PER_COURT = 7;
export const AUTOSAVE_INTERVAL = 5000; // 5 seconds

export function teamsOverlap(
  teamAId: string,
  teamBId: string,
  otherTeamAId: string,
  otherTeamBId: string,
) {
  return (
    teamAId === otherTeamAId ||
    teamAId === otherTeamBId ||
    teamBId === otherTeamAId ||
    teamBId === otherTeamBId
  );
}

export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

export function getTimeForSlotIndex(slotIndex: number): string {
  const totalMinutes = START_HOUR * 60 + START_MINUTE + slotIndex * SLOT_DURATION_MINUTES;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return formatTime(hour, minute);
}

export function generateTimeSlots(count: number, startIndex: number = 0): TimeSlotData[] {
  return Array.from({ length: count }, (_, i) => {
    const slotIndex = startIndex + i;
    return {
      id: `slot-${slotIndex}`,
      time: getTimeForSlotIndex(slotIndex),
      matchup: null,
    };
  });
}

export function getScheduledInEvent(
  event: ScheduleEvent,
  ignoredMatchupIds: Set<string> = new Set(),
) {
  return event.courts.flatMap((court) =>
    court.slots.flatMap((slot, slotIndex) => {
      if (!slot.matchup || ignoredMatchupIds.has(slot.matchup.id)) {
        return [];
      }
      return [{ matchup: slot.matchup, slotIndex }];
    }),
  );
}

export function getPlacementValidationError(
  matchup: Matchup,
  targetEvent: ScheduleEvent,
  targetSlotIndex: number,
  ignoredMatchupIds: Set<string> = new Set(),
): string | null {
  const scheduledInEvent = getScheduledInEvent(targetEvent, ignoredMatchupIds);

  const slotConflict = scheduledInEvent.find(
    (scheduled) =>
      scheduled.slotIndex === targetSlotIndex &&
      teamsOverlap(
        matchup.teamA.id,
        matchup.teamB.id,
        scheduled.matchup.teamA.id,
        scheduled.matchup.teamB.id,
      ),
  );
  if (slotConflict) {
    return "A team cannot play two matches at the same time.";
  }

  return null;
}

export function createNewEvent(name: string, date: string): ScheduleEvent {
  return {
    id: uuidv4(),
    name,
    date,
    courts: [
      { id: "A", slots: generateTimeSlots(DEFAULT_SLOTS_PER_COURT) },
      { id: "B", slots: generateTimeSlots(DEFAULT_SLOTS_PER_COURT) },
    ],
  };
}
