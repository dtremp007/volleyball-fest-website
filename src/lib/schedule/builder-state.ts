import type {
  getEventsBySeasonId,
  getMatchupsBySeasonId,
} from "~/lib/db/queries/schedule";
import type {
  ScheduleBuilderEvent,
  ScheduleBuilderInitialState,
  ScheduleBuilderMatchup,
  ScheduleBuilderSnapshot,
  ScheduleBuilderStateResponse,
} from "~/validators/schedule-builder.validators";
import { combineDateAndTime, getDatePart, getTimePart } from "./slot-times";

type DbMatchup = Awaited<ReturnType<typeof getMatchupsBySeasonId>>[number];
type DbEvent = Awaited<ReturnType<typeof getEventsBySeasonId>>[number];

type MatchupSource = Pick<DbMatchup, "id" | "category" | "teamA" | "teamB">;

export function toScheduleBuilderMatchup(matchup: MatchupSource): ScheduleBuilderMatchup {
  return {
    id: matchup.id,
    category: matchup.category,
    teamA: {
      id: matchup.teamA.id,
      name: matchup.teamA.name,
      logoUrl: matchup.teamA.logoUrl,
      category: matchup.category,
      unavailableDates: matchup.teamA.unavailableDates ?? undefined,
      isFarAway: matchup.teamA.isFarAway,
    },
    teamB: {
      id: matchup.teamB.id,
      name: matchup.teamB.name,
      logoUrl: matchup.teamB.logoUrl,
      category: matchup.category,
      unavailableDates: matchup.teamB.unavailableDates ?? undefined,
      isFarAway: matchup.teamB.isFarAway,
    },
  };
}

export function computePlacementRevision(
  matchups: Pick<DbMatchup, "id" | "eventId" | "courtId" | "slotIndex">[],
): string {
  return matchups
    .map(
      (matchup) =>
        `${matchup.id}:${matchup.eventId ?? "none"}:${matchup.courtId ?? "none"}:${matchup.slotIndex ?? -1}`,
    )
    .sort()
    .join("|");
}

export function toScheduleBuilderInitialState(
  matchups: DbMatchup[],
  events: DbEvent[],
): Omit<ScheduleBuilderInitialState, "revision"> {
  const scheduled = matchups.filter((m) => m.eventId !== null);
  const unscheduledMatchups = matchups
    .filter((m) => m.eventId === null)
    .map(toScheduleBuilderMatchup);

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
        A: { matchup: DbMatchup; slotIndex: number }[];
        B: { matchup: DbMatchup; slotIndex: number }[];
      }
    >,
  );

  for (const eventId in scheduledByEvent) {
    scheduledByEvent[eventId].A.sort((a, b) => a.slotIndex - b.slotIndex);
    scheduledByEvent[eventId].B.sort((a, b) => a.slotIndex - b.slotIndex);
  }

  const builderEvents: ScheduleBuilderEvent[] = events.map((dbEvent) => {
    const eventSchedule = scheduledByEvent[dbEvent.id];

    return {
      id: dbEvent.id,
      name: dbEvent.name,
      date: dbEvent.date,
      startTime: getTimePart(dbEvent.date),
      courts: [
        {
          id: "A" as const,
          matchups:
            eventSchedule?.A.map((s) => toScheduleBuilderMatchup(s.matchup)) ?? [],
        },
        {
          id: "B" as const,
          matchups:
            eventSchedule?.B.map((s) => toScheduleBuilderMatchup(s.matchup)) ?? [],
        },
      ],
    };
  });

  const matchupsByCategory = matchups.reduce(
    (acc, matchup) => {
      if (!acc[matchup.category]) acc[matchup.category] = [];
      acc[matchup.category].push(toScheduleBuilderMatchup(matchup));
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

export function buildScheduleBuilderStateResponse(
  matchups: DbMatchup[],
  events: DbEvent[],
): ScheduleBuilderStateResponse {
  const revision = computePlacementRevision(matchups);
  const initial = toScheduleBuilderInitialState(matchups, events);

  return {
    hasMatchups: matchups.length > 0,
    revision,
    ...initial,
  };
}

export function toScheduleBuilderSnapshot(
  events: ScheduleBuilderEvent[],
  unscheduledMatchups: ScheduleBuilderMatchup[],
): ScheduleBuilderSnapshot {
  return { events, unscheduledMatchups };
}

export type SaveScheduleInput = {
  seasonId: string;
  events: { id: string; name: string; date: string }[];
  matchups: {
    id: string;
    eventId: string | null;
    courtId: string | null;
    slotIndex: number | null;
  }[];
};

export function mapSnapshotToSaveInput(
  seasonId: string,
  snapshot: ScheduleBuilderSnapshot,
): SaveScheduleInput {
  const matchupPlacements: SaveScheduleInput["matchups"] = [];

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
    events: snapshot.events.map((e) => ({
      id: e.id,
      name: e.name,
      date: combineDateAndTime(getDatePart(e.date), e.startTime ?? getTimePart(e.date)),
    })),
    matchups: matchupPlacements,
  };
}
