import { create } from "zustand";
import type { DragData, Matchup, ScheduleEvent } from "./types";
import {
  createNewEvent,
  getPlacementValidationError,
  getTimeForSlotIndex,
} from "./utils";

type ScheduleState = {
  events: ScheduleEvent[];
  unscheduledMatchups: Matchup[];
  activeMatchup: Matchup | null;
  isDirty: boolean;
  lastSaved: Date | null;
};

type ScheduleActions = {
  init: (events: ScheduleEvent[], unscheduledMatchups: Matchup[]) => void;
  setActiveMatchup: (matchup: Matchup | null) => void;
  moveScheduledToUnscheduled: (
    matchup: Matchup,
    sourceEventId: string,
    sourceCourtId: string,
    sourceSlotId: string,
    sourceSlotIndex: number,
  ) => void;
  moveMatchupToSlot: (
    matchup: Matchup,
    source: DragData["source"],
    targetEventId: string,
    targetCourtId: string,
    targetSlotId: string,
  ) => { success: boolean; error?: string };
  addEvent: (name: string, date: string) => void;
  deleteEvent: (eventId: string) => void;
  updateEvent: (
    eventId: string,
    updates: Partial<Pick<ScheduleEvent, "name" | "date">>,
  ) => void;
  addSlot: (eventId: string) => void;
  setSaved: () => void;
  markDirty: () => void;
};

export const useScheduleStore = create<ScheduleState & ScheduleActions>((set, get) => ({
  events: [],
  unscheduledMatchups: [],
  activeMatchup: null,
  isDirty: false,
  lastSaved: null,

  init: (events, unscheduledMatchups) => {
    set({ events, unscheduledMatchups, isDirty: false, activeMatchup: null });
  },

  setActiveMatchup: (matchup) => {
    set({ activeMatchup: matchup });
  },

  moveScheduledToUnscheduled: (
    matchup,
    sourceEventId,
    sourceCourtId,
    sourceSlotId,
    sourceSlotIndex,
  ) => {
    set((state) => {
      const eventIndex = state.events.findIndex((evt) => evt.id === sourceEventId);
      const currentEvent = eventIndex >= 0 ? state.events[eventIndex] : null;
      if (!currentEvent) return state;

      const courtIndex = currentEvent.courts.findIndex(
        (court) => court.id === sourceCourtId,
      );
      const currentCourt = courtIndex >= 0 ? currentEvent.courts[courtIndex] : null;
      if (!currentCourt) return state;

      let targetSlotIndex = sourceSlotIndex;
      if (
        targetSlotIndex < 0 ||
        targetSlotIndex >= currentCourt.slots.length ||
        currentCourt.slots[targetSlotIndex]?.id !== sourceSlotId
      ) {
        targetSlotIndex = currentCourt.slots.findIndex(
          (slot) => slot.id === sourceSlotId,
        );
      }

      if (targetSlotIndex < 0) return state;
      const currentSlot = currentCourt.slots[targetSlotIndex];

      if (currentSlot?.matchup) {
        const nextSlots = [...currentCourt.slots];
        nextSlots[targetSlotIndex] = { ...currentSlot, matchup: null };

        const nextCourts = [...currentEvent.courts] as [
          ScheduleEvent["courts"][0],
          ScheduleEvent["courts"][1],
        ];
        nextCourts[courtIndex] = { ...currentCourt, slots: nextSlots };

        const nextEvents = [...state.events];
        nextEvents[eventIndex] = { ...currentEvent, courts: nextCourts };

        const alreadyUnscheduled = state.unscheduledMatchups.some(
          (m) => m.id === matchup.id,
        );

        return {
          events: nextEvents,
          unscheduledMatchups: alreadyUnscheduled
            ? state.unscheduledMatchups
            : [...state.unscheduledMatchups, matchup],
          isDirty: true,
        };
      }

      return state;
    });
  },

  moveMatchupToSlot: (matchup, source, targetEventId, targetCourtId, targetSlotId) => {
    let placementError: string | null = null;
    let didPlace = false;

    set((state) => {
      const targetEvent = state.events.find((e) => e.id === targetEventId);
      const targetCourt = targetEvent?.courts.find((c) => c.id === targetCourtId);
      const targetSlotIndex =
        targetCourt?.slots.findIndex((s) => s.id === targetSlotId) ?? -1;
      const targetSlot =
        targetSlotIndex >= 0 ? targetCourt?.slots[targetSlotIndex] : null;

      if (!targetEvent || targetSlotIndex < 0) return state;
      if (targetSlot?.matchup) return state;

      placementError = getPlacementValidationError(
        matchup,
        targetEvent,
        targetSlotIndex,
        new Set([matchup.id]),
      );
      if (placementError) return state;

      didPlace = true;

      const nextEvents = state.events.map((evt) => {
        const shouldTouchTarget = evt.id === targetEventId;
        const shouldTouchSource =
          source.type === "scheduled" && evt.id === source.eventId;

        if (!shouldTouchTarget && !shouldTouchSource) {
          return evt;
        }

        let eventChanged = false;
        const nextCourts = evt.courts.map((court) => {
          const shouldTouchTargetCourt = shouldTouchTarget && court.id === targetCourtId;
          const shouldTouchSourceCourt =
            shouldTouchSource &&
            source.type === "scheduled" &&
            court.id === source.courtId;

          if (!shouldTouchTargetCourt && !shouldTouchSourceCourt) {
            return court;
          }

          let courtChanged = false;
          const nextSlots = court.slots.map((slot) => {
            let nextMatchup = slot.matchup;

            if (
              shouldTouchSourceCourt &&
              source.type === "scheduled" &&
              slot.id === source.slotId
            ) {
              nextMatchup = null;
            }
            if (shouldTouchTargetCourt && slot.id === targetSlotId) {
              nextMatchup = matchup;
            }

            if (nextMatchup === slot.matchup) {
              return slot;
            }

            courtChanged = true;
            return { ...slot, matchup: nextMatchup };
          });

          if (!courtChanged) {
            return court;
          }

          eventChanged = true;
          return { ...court, slots: nextSlots };
        });

        if (!eventChanged) {
          return evt;
        }

        return {
          ...evt,
          courts: nextCourts as [(typeof evt.courts)[0], (typeof evt.courts)[1]],
        };
      });

      let nextUnscheduled = state.unscheduledMatchups;
      if (source.type === "unscheduled") {
        nextUnscheduled = nextUnscheduled.filter((m) => m.id !== matchup.id);
      }

      return {
        events: nextEvents,
        unscheduledMatchups: nextUnscheduled,
        isDirty: true,
      };
    });

    if (placementError) {
      return { success: false, error: placementError };
    }

    return { success: didPlace };
  },

  addEvent: (name, date) => {
    set((state) => ({
      events: [...state.events, createNewEvent(name, date)],
      isDirty: true,
    }));
  },

  deleteEvent: (eventId) => {
    set((state) => {
      const event = state.events.find((e) => e.id === eventId);
      if (!event) return state;

      // Move all matchups back to unscheduled
      const matchupsToReturn: Matchup[] = [];
      event.courts.forEach((court) => {
        court.slots.forEach((slot) => {
          if (slot.matchup) {
            matchupsToReturn.push(slot.matchup);
          }
        });
      });

      return {
        events: state.events.filter((e) => e.id !== eventId),
        unscheduledMatchups:
          matchupsToReturn.length > 0
            ? [...state.unscheduledMatchups, ...matchupsToReturn]
            : state.unscheduledMatchups,
        isDirty: true,
      };
    });
  },

  updateEvent: (eventId, updates) => {
    set((state) => ({
      events: state.events.map((event) =>
        event.id === eventId ? { ...event, ...updates } : event,
      ),
      isDirty: true,
    }));
  },

  addSlot: (eventId) => {
    set((state) => ({
      events: state.events.map((event) => {
        if (event.id !== eventId) return event;

        const maxSlots = Math.max(
          event.courts[0].slots.length,
          event.courts[1].slots.length,
        );

        return {
          ...event,
          courts: event.courts.map((court) => ({
            ...court,
            slots: [
              ...court.slots,
              {
                id: `slot-${maxSlots}`,
                time: getTimeForSlotIndex(maxSlots),
                matchup: null,
              },
            ],
          })) as [ScheduleEvent["courts"][0], ScheduleEvent["courts"][1]],
        };
      }),
      isDirty: true,
    }));
  },

  setSaved: () => {
    set({ isDirty: false, lastSaved: new Date() });
  },

  markDirty: () => {
    set({ isDirty: true });
  },
}));
