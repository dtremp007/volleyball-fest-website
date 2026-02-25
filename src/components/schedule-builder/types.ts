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

export type Court = {
  id: "A" | "B";
  matchups: Matchup[];
};

export type ScheduleEvent = {
  id: string;
  name: string;
  date: string;
  courts: [Court, Court];
};

export type DragData = {
  type: "matchup";
  matchup: Matchup;
  source:
    | { type: "unscheduled" }
    | {
        type: "scheduled";
        eventId: string;
        courtId: "A" | "B";
        index: number;
      };
};

export type DropData = {
  type: "court";
  eventId: string;
  courtId: "A" | "B";
};
