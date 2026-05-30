import { startOfDay, subDays } from "date-fns";
import type { Database } from "~/lib/db";
import {
  getPlayoffScheduleEventsBySeasonId,
  getPlayoffScheduleMatchupsBySeasonId,
} from "~/lib/db/queries/playoff";
import { getPublicSchedule } from "~/lib/db/queries/schedule";

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
