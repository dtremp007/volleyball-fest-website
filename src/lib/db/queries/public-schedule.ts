import { startOfDay, subDays } from "date-fns";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "~/lib/db";
import {
  getPlayoffScheduleEventsBySeasonId,
  getPlayoffScheduleMatchupsBySeasonId,
} from "~/lib/db/queries/playoff";
import { getPublicSchedule } from "~/lib/db/queries/schedule";
import * as schema from "~/lib/db/schema";

function getUpcomingCutoffDate() {
  const yesterday = startOfDay(subDays(new Date(), 1));
  return yesterday.toISOString().split("T")[0] ?? "";
}

async function getPlayoffScheduleMatchupsForEventIds(
  db: Database,
  seasonId: string,
  eventIds: string[],
) {
  if (eventIds.length === 0) return [];

  const matchupRows = await db
    .select({
      id: schema.playoffMatchup.id,
      label: schema.playoffMatchup.label,
      category: schema.category.name,
      bestOf: schema.playoffMatchup.bestOf,
      duration: schema.playoffMatchup.duration,
      eventId: schema.playoffMatchup.eventId,
      courtId: schema.playoffMatchup.courtId,
      slotIndex: schema.playoffMatchup.slotIndex,
    })
    .from(schema.playoffMatchup)
    .innerJoin(schema.category, eq(schema.playoffMatchup.categoryId, schema.category.id))
    .where(
      and(
        eq(schema.playoffMatchup.seasonId, seasonId),
        inArray(schema.playoffMatchup.eventId, eventIds),
      ),
    )
    .orderBy(
      sql`(${schema.playoffMatchup.slotIndex} IS NULL) ASC`,
      asc(schema.playoffMatchup.slotIndex),
      asc(schema.playoffMatchup.label),
    );

  const matchupIds = matchupRows.map((matchup) => matchup.id);
  const teamRows =
    matchupIds.length > 0
      ? await db
          .select({
            id: schema.playoffMatchupTeam.id,
            matchupId: schema.playoffMatchupTeam.matchupId,
            slotIndex: schema.playoffMatchupTeam.slotIndex,
            teamId: schema.playoffMatchupTeam.teamId,
            teamName: schema.seasonTeam.name,
            teamLogoUrl: schema.seasonTeam.logoUrl,
            label: schema.playoffMatchupTeam.label,
            dependencyType: schema.playoffMatchupTeam.dependencyType,
          })
          .from(schema.playoffMatchupTeam)
          .innerJoin(
            schema.playoffMatchup,
            eq(schema.playoffMatchupTeam.matchupId, schema.playoffMatchup.id),
          )
          .leftJoin(
            schema.seasonTeam,
            and(
              eq(schema.playoffMatchupTeam.teamId, schema.seasonTeam.teamId),
              eq(schema.playoffMatchup.seasonId, schema.seasonTeam.seasonId),
            ),
          )
          .where(inArray(schema.playoffMatchupTeam.matchupId, matchupIds))
          .orderBy(
            asc(schema.playoffMatchupTeam.matchupId),
            asc(schema.playoffMatchupTeam.slotIndex),
          )
      : [];

  const teamsByMatchupId = teamRows.reduce((acc, row) => {
    const existing = acc.get(row.matchupId) ?? [];
    existing.push(row);
    acc.set(row.matchupId, existing);
    return acc;
  }, new Map<string, typeof teamRows>());

  return matchupRows.map((matchup) => ({
    ...matchup,
    teams: teamsByMatchupId.get(matchup.id) ?? [],
  }));
}

export async function getPublicUnifiedSchedule(
  db: Database,
  seasonId: string,
  options?: { upcomingOnly?: boolean; limit?: number },
) {
  const { upcomingOnly = false, limit } = options ?? {};
  const upcomingCutoff = upcomingOnly ? getUpcomingCutoffDate() : null;

  const allPlayoffEvents = await getPlayoffScheduleEventsBySeasonId(db, seasonId);
  const playoffEvents = upcomingCutoff
    ? allPlayoffEvents.filter((event) => event.date >= upcomingCutoff)
    : allPlayoffEvents;
  const playoffEventIds = playoffEvents.map((event) => event.id);

  const [regularEvents, playoffMatchups] = await Promise.all([
    // Limit is applied after merging regular + playoff events.
    getPublicSchedule(db, seasonId, { upcomingOnly }),
    upcomingOnly
      ? getPlayoffScheduleMatchupsForEventIds(db, seasonId, playoffEventIds)
      : getPlayoffScheduleMatchupsBySeasonId(db, seasonId),
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

  const unifiedEvents = [...normalizedRegularEvents, ...normalizedPlayoffEvents]
    .filter((event) => event.matchups.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  return limit ? unifiedEvents.slice(0, limit) : unifiedEvents;
}
