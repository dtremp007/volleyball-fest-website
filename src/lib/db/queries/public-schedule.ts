import { startOfDay, subDays } from "date-fns";
import { eq } from "drizzle-orm";
import type { Database } from "~/lib/db";
import {
  getPlayoffScheduleEventsBySeasonId,
  getPlayoffScheduleMatchupsBySeasonId,
} from "~/lib/db/queries/playoff";
import {
  getEventsBySeasonId,
  getMatchupsBySeasonId,
  getPublicSchedule,
} from "~/lib/db/queries/schedule";
import * as schema from "~/lib/db/schema";
import { calculatePlayoffWinner } from "~/lib/playoffs/winner";
import {
  getDatePart,
  getSlotDurationsByIndex,
  getSlotTimeConfigForEvent,
  getTimeForSlotIndexWithDurations,
} from "~/lib/schedule/slot-times";
import { contributionFromFirstTwoSets } from "~/lib/standings/ranking";

export async function getPublicUnifiedSchedule(
  db: Database,
  seasonId: string,
  options?: { upcomingOnly?: boolean; limit?: number },
) {
  const { upcomingOnly = false, limit } = options ?? {};
  const [regularEvents, playoffEvents, playoffMatchups] = await Promise.all([
    getPublicSchedule(db, seasonId, { upcomingOnly: false }),
    getPlayoffScheduleEventsBySeasonId(db, seasonId),
    getPlayoffScheduleMatchupsBySeasonId(db, seasonId),
  ]);

  const playoffMatchupsByEventId = new Map<string, typeof playoffMatchups>();
  for (const matchup of playoffMatchups) {
    if (!matchup.eventId) continue;
    const existing = playoffMatchupsByEventId.get(matchup.eventId) ?? [];
    existing.push(matchup);
    playoffMatchupsByEventId.set(matchup.eventId, existing);
  }

  const normalizedRegularEvents = regularEvents.map((event) => ({
    ...event,
    matchups: event.matchups.map((matchup) => ({
      ...matchup,
      type: "regular" as const,
      label: null,
      round: null,
    })),
  }));

  const normalizedPlayoffEvents = playoffEvents.map((event) => {
    const eventMatchups = [...(playoffMatchupsByEventId.get(event.id) ?? [])].sort(
      (a, b) => {
        const slotCompare = (a.slotIndex ?? 999) - (b.slotIndex ?? 999);
        if (slotCompare !== 0) return slotCompare;
        return (a.courtId ?? "Z").localeCompare(b.courtId ?? "Z");
      },
    );

    return {
      id: event.id,
      name: event.name,
      date: event.date,
      matchups: eventMatchups.map((matchup) => {
        const teams = [...matchup.teams].sort((a, b) => a.slotIndex - b.slotIndex);
        const teamA = teams[0];
        const teamB = teams[1];

        return {
          id: matchup.id,
          type: "playoff" as const,
          label: matchup.label,
          round: null,
          teamA: teamA?.teamId
            ? { name: teamA.teamName ?? "", logoUrl: teamA.teamLogoUrl }
            : { name: teamA?.label ?? "", logoUrl: null },
          teamB: teamB?.teamId
            ? { name: teamB.teamName ?? "", logoUrl: teamB.teamLogoUrl }
            : { name: teamB?.label ?? "", logoUrl: null },
          category: matchup.category,
          courtId: matchup.courtId,
          slotIndex: matchup.slotIndex,
          duration: matchup.duration,
        };
      }),
    };
  });

  let unifiedEvents = [...normalizedRegularEvents, ...normalizedPlayoffEvents]
    .filter((event) => event.matchups.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (upcomingOnly) {
    const yesterday = startOfDay(subDays(new Date(), 1));
    const yesterdayDate = yesterday.toISOString().split("T")[0] ?? "";
    unifiedEvents = unifiedEvents.filter((event) => event.date >= yesterdayDate);
  }

  return limit ? unifiedEvents.slice(0, limit) : unifiedEvents;
}

export type PublicTeamGame = {
  id: string;
  type: "regular" | "playoff";
  label: string | null;
  eventName: string;
  date: string;
  /** Display time ("4:15 PM"), computed from every game that night like the main schedule. */
  time: string | null;
  courtId: string | null;
  opponent: { name: string; logoUrl: string | null };
  played: boolean;
  /** Before today in the league's time zone, so SSR and the browser agree. */
  isPast: boolean;
  /** Sets 1–2 won/lost, counted like the standings; null until both sets are complete. */
  result: { setsWon: number; setsLost: number } | null;
};

const LEAGUE_TIME_ZONE = "America/Chihuahua";

function getLeagueToday() {
  // en-CA formats as YYYY-MM-DD, matching the stored event dates.
  return new Date().toLocaleDateString("en-CA", { timeZone: LEAGUE_TIME_ZONE });
}

function getGameTime(
  eventDate: string,
  eventMatchups: { slotIndex: number | null; duration?: number | null }[],
  slotIndex: number | null,
) {
  if (slotIndex === null) return null;
  return getTimeForSlotIndexWithDurations(
    slotIndex,
    getSlotDurationsByIndex(eventMatchups),
    getSlotTimeConfigForEvent(eventDate),
  );
}

/**
 * Every scheduled game (regular season and playoffs) for one team, in date order.
 */
export async function getPublicTeamSchedule(
  db: Database,
  seasonId: string,
  teamId: string,
): Promise<PublicTeamGame[]> {
  const [events, matchups, playoffEvents, playoffMatchups, playoffPoints] =
    await Promise.all([
      getEventsBySeasonId(db, seasonId),
      getMatchupsBySeasonId(db, seasonId),
      getPlayoffScheduleEventsBySeasonId(db, seasonId),
      getPlayoffScheduleMatchupsBySeasonId(db, seasonId),
      db
        .select({
          matchupId: schema.playoffPoint.matchupId,
          teamId: schema.playoffPoint.teamId,
          set: schema.playoffPoint.set,
          points: schema.playoffPoint.points,
        })
        .from(schema.playoffPoint)
        .where(eq(schema.playoffPoint.seasonId, seasonId)),
    ]);

  const games: PublicTeamGame[] = [];
  const today = getLeagueToday();

  const eventsById = new Map(events.map((event) => [event.id, event]));
  for (const matchup of matchups) {
    const event = matchup.eventId ? eventsById.get(matchup.eventId) : undefined;
    if (!event) continue;
    const isTeamA = matchup.teamA.id === teamId;
    if (!isTeamA && matchup.teamB.id !== teamId) continue;

    const opponent = isTeamA ? matchup.teamB : matchup.teamA;
    const contribution = contributionFromFirstTwoSets(matchup.sets);
    const eventMatchups = matchups.filter((m) => m.eventId === event.id);
    games.push({
      id: matchup.id,
      type: "regular",
      label: null,
      eventName: event.name,
      date: event.date,
      time: getGameTime(event.date, eventMatchups, matchup.slotIndex),
      courtId: matchup.courtId,
      opponent: { name: opponent.name, logoUrl: opponent.logoUrl || null },
      played: matchup.hasScores,
      isPast: getDatePart(event.date) < today,
      // In a 2-set game, standings points equal sets won.
      result: contribution
        ? {
            setsWon: isTeamA ? contribution.ptsA : contribution.ptsB,
            setsLost: isTeamA ? contribution.ptsB : contribution.ptsA,
          }
        : null,
    });
  }

  const playoffEventsById = new Map(playoffEvents.map((event) => [event.id, event]));
  for (const matchup of playoffMatchups) {
    const event = matchup.eventId ? playoffEventsById.get(matchup.eventId) : undefined;
    if (!event) continue;
    const teams = [...matchup.teams].sort((a, b) => a.slotIndex - b.slotIndex);
    const ownIndex = teams.findIndex((team) => team.teamId === teamId);
    if (ownIndex === -1) continue;

    const opponent = teams[ownIndex === 0 ? 1 : 0];
    const points = playoffPoints.filter((point) => point.matchupId === matchup.id);
    const winner = calculatePlayoffWinner({ bestOf: matchup.bestOf, teams, points });
    const opponentId = opponent?.teamId ?? "";
    const eventMatchups = playoffMatchups.filter((m) => m.eventId === event.id);
    games.push({
      id: matchup.id,
      type: "playoff",
      label: matchup.label,
      eventName: event.name,
      date: event.date,
      time: getGameTime(event.date, eventMatchups, matchup.slotIndex),
      courtId: matchup.courtId,
      opponent: opponent?.teamId
        ? { name: opponent.teamName ?? "", logoUrl: opponent.teamLogoUrl }
        : { name: opponent?.label ?? "Por definir", logoUrl: null },
      played: points.length > 0,
      isPast: getDatePart(event.date) < today,
      result: winner
        ? {
            setsWon: winner.teamSetsWon[teamId] ?? 0,
            setsLost: winner.teamSetsWon[opponentId] ?? 0,
          }
        : null,
    });
  }

  return games.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.time && b.time ? toMinutes(a.time) - toMinutes(b.time) : 0),
  );
}

function toMinutes(displayTime: string) {
  const [clock = "", period] = displayTime.split(" ");
  const [hour = 0, minute = 0] = clock.split(":").map(Number);
  return ((hour % 12) + (period === "PM" ? 12 : 0)) * 60 + minute;
}
