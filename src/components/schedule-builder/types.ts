export type Team = {
  id: string;
  name: string;
  logoUrl: string;
  category: string;
  unavailableDates?: string;
  isFarAway?: boolean;
};

export type Matchup = {
  id: string;
  teamA: Team;
  teamB: Team;
  category: string;
};

export type TimeSlot = {
  id: string;
  time: string;
  matchup: Matchup | null;
};

export type Court = {
  id: "A" | "B";
  slots: TimeSlot[];
};

export type ScheduleEvent = {
  id: string;
  name: string;
  date: string;
  courts: [Court, Court];
};

// Drag and drop types
export type DragData = {
  type: "matchup";
  matchup: Matchup;
  source:
    | { type: "unscheduled" }
    | {
        type: "scheduled";
        eventId: string;
        courtId: "A" | "B";
        slotId: string;
        slotIndex: number;
      };
};

export type DropData = {
  type: "slot";
  eventId: string;
  courtId: "A" | "B";
  slotId: string;
};
