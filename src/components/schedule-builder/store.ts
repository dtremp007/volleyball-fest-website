import { arrayMove } from "@dnd-kit/sortable";
import { create } from "zustand";
import type { DragData, Matchup, ScheduleEvent } from "./types";
import { createNewEvent } from "./utils";

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
    sourceIndex: number,
  ) => void;
  moveMatchupToCourt: (
    matchup: Matchup,
    source: DragData["source"],
    targetEventId: string,
    targetCourtId: string,
    targetIndex?: number,
  ) => void;
  reorderMatchup: (
    eventId: string,
    courtId: "A" | "B",
    activeMatchupId: string,
    overMatchupId: string,
  ) => void;
  addEvent: (name: string, date: string) => void;
  deleteEvent: (eventId: string) => void;
  updateEvent: (
    eventId: string,
    updates: Partial<Pick<ScheduleEvent, "name" | "date">>,
  ) => void;
  setSaved: () => void;
  markDirty: () => void;
};

export const useScheduleStore = create<ScheduleState & ScheduleActions>((set) => ({
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

  moveScheduledToUnscheduled: (matchup, sourceEventId, sourceCourtId, sourceIndex) => {
    set((state) => {
      const eventIndex = state.events.findIndex((evt) => evt.id === sourceEventId);
      const currentEvent = eventIndex >= 0 ? state.events[eventIndex] : null;
      if (!currentEvent) return state;

      const courtIndex = currentEvent.courts.findIndex(
        (court) => court.id === sourceCourtId,
      );
      const currentCourt = courtIndex >= 0 ? currentEvent.courts[courtIndex] : null;
      if (!currentCourt) return state;

      if (
        sourceIndex < 0 ||
        sourceIndex >= currentCourt.matchups.length ||
        currentCourt.matchups[sourceIndex]?.id !== matchup.id
      ) {
        return state;
      }

      const nextMatchups = [...currentCourt.matchups];
      nextMatchups.splice(sourceIndex, 1);

      const nextCourts = [...currentEvent.courts] as [
        ScheduleEvent["courts"][0],
        ScheduleEvent["courts"][1],
      ];
      nextCourts[courtIndex] = { ...currentCourt, matchups: nextMatchups };

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
    });
  },

  moveMatchupToCourt: (matchup, source, targetEventId, targetCourtId, targetIndex) => {
    set((state) => {
      const targetEventIdx = state.events.findIndex((e) => e.id === targetEventId);
      if (targetEventIdx < 0) return state;

      let nextEvents = [...state.events];

      // Remove from source if scheduled
      if (source.type === "scheduled") {
        const sourceEventIdx = nextEvents.findIndex((e) => e.id === source.eventId);
        if (sourceEventIdx >= 0) {
          const sourceEvent = nextEvents[sourceEventIdx];
          const sourceCourtIdx = sourceEvent.courts.findIndex(
            (c) => c.id === source.courtId,
          );
          if (sourceCourtIdx >= 0) {
            const sourceCourt = sourceEvent.courts[sourceCourtIdx];
            const nextSourceMatchups = sourceCourt.matchups.filter(
              (m) => m.id !== matchup.id,
            );
            const nextSourceCourts = [...sourceEvent.courts] as [
              ScheduleEvent["courts"][0],
              ScheduleEvent["courts"][1],
            ];
            nextSourceCourts[sourceCourtIdx] = {
              ...sourceCourt,
              matchups: nextSourceMatchups,
            };
            nextEvents[sourceEventIdx] = { ...sourceEvent, courts: nextSourceCourts };
          }
        }
      }

      // Insert into target court
      const targetEvent = nextEvents[targetEventIdx];
      const targetCourtIdx = targetEvent.courts.findIndex((c) => c.id === targetCourtId);
      if (targetCourtIdx < 0) return state;

      const targetCourt = targetEvent.courts[targetCourtIdx];
      const nextTargetMatchups = [...targetCourt.matchups];

      if (targetIndex !== undefined && targetIndex >= 0) {
        nextTargetMatchups.splice(targetIndex, 0, matchup);
      } else {
        nextTargetMatchups.push(matchup);
      }

      const nextTargetCourts = [...targetEvent.courts] as [
        ScheduleEvent["courts"][0],
        ScheduleEvent["courts"][1],
      ];
      nextTargetCourts[targetCourtIdx] = {
        ...targetCourt,
        matchups: nextTargetMatchups,
      };
      nextEvents[targetEventIdx] = { ...targetEvent, courts: nextTargetCourts };

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
  },

  reorderMatchup: (eventId, courtId, activeMatchupId, overMatchupId) => {
    set((state) => {
      const eventIdx = state.events.findIndex((e) => e.id === eventId);
      if (eventIdx < 0) return state;

      const event = state.events[eventIdx];
      const courtIdx = event.courts.findIndex((c) => c.id === courtId);
      if (courtIdx < 0) return state;

      const court = event.courts[courtIdx];
      const oldIndex = court.matchups.findIndex((m) => m.id === activeMatchupId);
      const newIndex = court.matchups.findIndex((m) => m.id === overMatchupId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return state;

      const nextMatchups = arrayMove(court.matchups, oldIndex, newIndex);
      const nextCourts = [...event.courts] as [
        ScheduleEvent["courts"][0],
        ScheduleEvent["courts"][1],
      ];
      nextCourts[courtIdx] = { ...court, matchups: nextMatchups };

      const nextEvents = [...state.events];
      nextEvents[eventIdx] = { ...event, courts: nextCourts };

      return { events: nextEvents, isDirty: true };
    });
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

      const matchupsToReturn: Matchup[] = [];
      event.courts.forEach((court) => {
        court.matchups.forEach((matchup) => {
          matchupsToReturn.push(matchup);
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

  setSaved: () => {
    set({ isDirty: false, lastSaved: new Date() });
  },

  markDirty: () => {
    set({ isDirty: true });
  },
}));
