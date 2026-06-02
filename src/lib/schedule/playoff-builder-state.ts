import type {
  ScheduleBuilderEvent,
  ScheduleBuilderInitialState,
  ScheduleBuilderMatchup,
  ScheduleBuilderSnapshot,
  ScheduleBuilderStateResponse,
} from "~/validators/schedule-builder.validators";
import { combineDateAndTime, getDatePart, getTimePart } from "./slot-times";

type PlayoffScheduleEvent = {
  id: string;
  name: string;
  date: string;
  startTime?: string;
};

type PlayoffScheduleSlot = {
  id: string;
  slotIndex: number;
  teamId: string | null;
  teamName: string | null;
  teamLogoUrl: string | null;
  label: string;
};

type PlayoffScheduleMatchup = {
  id: string;
  category: string;
  eventId: string | null;
  courtId: string | null;
  slotIndex: number | null;
  label: string;
  duration: number;
  teams: PlayoffScheduleSlot[];
};

export function toPlayoffScheduleBuilderMatchup(
  matchup: PlayoffScheduleMatchup,
): ScheduleBuilderMatchup {
  const slots = [...matchup.teams].sort((a, b) => a.slotIndex - b.slotIndex);
  const [slotA, slotB] = slots;

  return {
    id: matchup.id,
    label: matchup.label,
    category: matchup.category,
    duration: matchup.duration,
    teamA: {
      id: slotA?.teamId ?? slotA?.id ?? `${matchup.id}:slot-0`,
      name: slotA?.teamName ?? slotA?.label ?? "TBD",
      logoUrl: slotA?.teamLogoUrl ?? "",
      category: matchup.category,
      isPlaceholder: !slotA?.teamId,
    },
    teamB: {
      id: slotB?.teamId ?? slotB?.id ?? `${matchup.id}:slot-1`,
      name: slotB?.teamName ?? slotB?.label ?? "TBD",
      logoUrl: slotB?.teamLogoUrl ?? "",
      category: matchup.category,
      isPlaceholder: !slotB?.teamId,
    },
  };
}

export function computePlayoffPlacementRevision(
  matchups: Pick<PlayoffScheduleMatchup, "id" | "eventId" | "courtId" | "slotIndex">[],
): string {
  return matchups
    .map(
      (matchup) =>
        `${matchup.id}:${matchup.eventId ?? "none"}:${matchup.courtId ?? "none"}:${matchup.slotIndex ?? -1}`,
    )
    .sort()
    .join("|");
}

export function toPlayoffScheduleBuilderInitialState(
  matchups: PlayoffScheduleMatchup[],
  events: PlayoffScheduleEvent[],
): Omit<ScheduleBuilderInitialState, "revision"> {
  const scheduled = matchups.filter((m) => m.eventId !== null);
  const unscheduledMatchups = matchups
    .filter((m) => m.eventId === null)
    .map(toPlayoffScheduleBuilderMatchup);

  const scheduledByEvent = scheduled.reduce(
    (acc, matchup) => {
      if (
        !matchup.eventId ||
        matchup.slotIndex === null ||
        (matchup.courtId !== "A" && matchup.courtId !== "B")
      ) {
        return acc;
      }

      if (!acc[matchup.eventId]) {
        acc[matchup.eventId] = { A: [], B: [] };
      }

      acc[matchup.eventId][matchup.courtId].push({
        matchup,
        slotIndex: matchup.slotIndex,
      });

      return acc;
    },
    {} as Record<
      string,
      {
        A: { matchup: PlayoffScheduleMatchup; slotIndex: number }[];
        B: { matchup: PlayoffScheduleMatchup; slotIndex: number }[];
      }
    >,
  );

  for (const eventId in scheduledByEvent) {
    scheduledByEvent[eventId].A.sort((a, b) => a.slotIndex - b.slotIndex);
    scheduledByEvent[eventId].B.sort((a, b) => a.slotIndex - b.slotIndex);
  }

  const builderEvents: ScheduleBuilderEvent[] = events.map((event) => {
    const eventSchedule = scheduledByEvent[event.id];

    return {
      id: event.id,
      name: event.name,
      date: event.date,
      startTime: event.startTime ?? getTimePart(event.date),
      courts: [
        {
          id: "A" as const,
          matchups:
            eventSchedule?.A.map((s) => toPlayoffScheduleBuilderMatchup(s.matchup)) ?? [],
        },
        {
          id: "B" as const,
          matchups:
            eventSchedule?.B.map((s) => toPlayoffScheduleBuilderMatchup(s.matchup)) ?? [],
        },
      ],
    };
  });

  const matchupsByCategory = matchups.reduce(
    (acc, matchup) => {
      if (!acc[matchup.category]) acc[matchup.category] = [];
      acc[matchup.category].push(toPlayoffScheduleBuilderMatchup(matchup));
      return acc;
    },
    {} as Record<string, ScheduleBuilderMatchup[]>,
  );

  return {
    events: builderEvents,
    unscheduledMatchups,
    matchupsByCategory,
  };
}

export function buildPlayoffScheduleBuilderStateResponse(
  matchups: PlayoffScheduleMatchup[],
  events: PlayoffScheduleEvent[],
): ScheduleBuilderStateResponse {
  const revision = computePlayoffPlacementRevision(matchups);
  const initial = toPlayoffScheduleBuilderInitialState(matchups, events);

  return {
    hasMatchups: matchups.length > 0,
    revision,
    ...initial,
  };
}

export function mapPlayoffSnapshotToSaveInput(
  seasonId: string,
  snapshot: ScheduleBuilderSnapshot,
) {
  const matchupPlacements: {
    id: string;
    eventId: string | null;
    courtId: string | null;
    slotIndex: number | null;
  }[] = [];

  snapshot.events.forEach((event) => {
    event.courts.forEach((court) => {
      court.matchups.forEach((matchup, index) => {
        matchupPlacements.push({
          id: matchup.id,
          eventId: event.id,
          courtId: court.id,
          slotIndex: index,
        });
      });
    });
  });

  snapshot.unscheduledMatchups.forEach((matchup) => {
    matchupPlacements.push({
      id: matchup.id,
      eventId: null,
      courtId: null,
      slotIndex: null,
    });
  });

  return {
    seasonId,
    events: snapshot.events.map((event) => ({
      id: event.id,
      name: event.name,
      date: combineDateAndTime(
        getDatePart(event.date),
        event.startTime ?? getTimePart(event.date),
      ),
    })),
    matchups: matchupPlacements,
  };
}
