import type { ScheduleBuilderMatchup } from "~/validators/schedule-builder.validators";

export type {
  ScheduleBuilderCourt as Court,
  ScheduleBuilderMatchup as Matchup,
  ScheduleBuilderEvent as ScheduleEvent,
  ScheduleBuilderTeam as Team,
} from "~/validators/schedule-builder.validators";

export type DragData = {
  type: "matchup";
  matchup: ScheduleBuilderMatchup;
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
