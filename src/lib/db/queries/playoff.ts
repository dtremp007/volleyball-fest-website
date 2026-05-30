import { addDays, format, getDay, parseISO } from "date-fns";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Database } from "~/lib/db";
import { getCategories, getCategoryById } from "~/lib/db/queries/category";
import {
  getStandingsBySeasonId,
  type EventWithMatchups,
  type TeamStanding,
} from "~/lib/db/queries/schedule";
import * as schema from "~/lib/db/schema";
import { calculatePlayoffWinner } from "~/lib/playoffs/winner";
import { combineDateAndTime, getDatePart, getTimePart } from "~/lib/schedule/slot-times";
import type { PlayoffFormat } from "../schema/team.schema";

type Seed = {
  teamId: string;
  label: string;
  rank: number;
  groupName: string;
};

type GeneratedMatchup = {
  id: string;
  seasonId: string;
  categoryId: string;
  label: string;
  round: string;
  bestOf: number;
  duration: number;
};

type GeneratedMatchupTeam = {
  id: string;
  matchupId: string;
  slotIndex: number;
  teamId: string | null;
  label: string;
  dependsOn: string | null;
  dependencyType: PlayoffDependencyType;
};

type PlayoffTemplate = {
  matchups: GeneratedMatchup[];
  teams: GeneratedMatchupTeam[];
};

type PlayoffDependencyType = "winner" | "loser";

const PLAYOFF_ROUND_ORDER = [
  "play-in",
  "quarter-final",
  "semifinal",
  "third-place",
  "final",
];
const PLAYOFF_ROUND_EVENT_INDEX: Record<string, number> = {
  "play-in": 0,
  "quarter-final": 0,
  semifinal: 1,
  "third-place": 2,
  final: 2,
};
const CAT_FEMENIL = "cat-femenil";
const CAT_SEGUNDA_FUERZA = "cat-segunda-fuerza";
const CAT_VARONIL_LIBRE = "cat-varonil-libre";
const PLAYOFF_LAST_DAY_CATEGORY_ORDER = [
  CAT_FEMENIL,
  CAT_SEGUNDA_FUERZA,
  CAT_VARONIL_LIBRE,
];

export function getPlayoffQualifierCount(format: PlayoffFormat | null | undefined) {
  return format === "top-5" ? 5 : 4;
}

export async function getPlayoffScheduleEventsBySeasonId(db: Database, seasonId: string) {
  return await db
    .select({
      id: schema.playoffScheduleEvent.id,
      name: schema.playoffScheduleEvent.name,
      date: schema.playoffScheduleEvent.startTime,
      seasonId: schema.playoffScheduleEvent.seasonId,
    })
    .from(schema.playoffScheduleEvent)
    .where(eq(schema.playoffScheduleEvent.seasonId, seasonId))
    .orderBy(asc(schema.playoffScheduleEvent.startTime));
}

export async function deletePlayoffScheduleEvent(db: Database, id: string) {
  await db
    .update(schema.playoffMatchup)
    .set({ eventId: null, courtId: null, slotIndex: null })
    .where(eq(schema.playoffMatchup.eventId, id));

  await db
    .delete(schema.playoffScheduleEvent)
    .where(eq(schema.playoffScheduleEvent.id, id));
}

export async function updatePlayoffScheduleEvent(
  db: Database,
  id: string,
  params: { name?: string; date?: string },
) {
  const updateData: { name?: string; startTime?: string } = {};
  if (params.name !== undefined) {
    updateData.name = params.name;
  }
  if (params.date !== undefined) {
    updateData.startTime = params.date;
  }
  await db
    .update(schema.playoffScheduleEvent)
    .set(updateData)
    .where(eq(schema.playoffScheduleEvent.id, id));
}

export async function createDefaultPlayoffScheduleEvents(db: Database, seasonId: string) {
  const existingPlayoffEvents = await getPlayoffScheduleEventsBySeasonId(db, seasonId);
  if (existingPlayoffEvents.length > 0) {
    throw new Error("Playoff dates already exist for this season.");
  }

  const [lastRegularSeasonEvent] = await db
    .select({ date: schema.scheduleEvent.startTime })
    .from(schema.scheduleEvent)
    .where(eq(schema.scheduleEvent.seasonId, seasonId))
    .orderBy(desc(schema.scheduleEvent.startTime))
    .limit(1);

  if (!lastRegularSeasonEvent) {
    throw new Error("Add regular season dates before creating playoff dates.");
  }

  const lastRegularSeasonDate = parseISO(getDatePart(lastRegularSeasonEvent.date));
  const daysUntilFollowingSaturday = (6 - getDay(lastRegularSeasonDate) + 7) % 7 || 7;
  const firstSaturday = addDays(lastRegularSeasonDate, daysUntilFollowingSaturday);
  const dates = [firstSaturday, addDays(firstSaturday, 7), addDays(firstSaturday, 8)];

  const events = dates.map((date) => {
    const dateOnly = format(date, "yyyy-MM-dd");
    return {
      id: uuidv4(),
      name: format(date, "MMM d, yyyy"),
      startTime: combineDateAndTime(dateOnly, getTimePart("")),
      seasonId,
    };
  });

  await db.insert(schema.playoffScheduleEvent).values(events);

  return events.map((event) => ({
    id: event.id,
    name: event.name,
    date: event.startTime,
    seasonId: event.seasonId,
  }));
}

export async function getPlayoffScheduleMatchupsBySeasonId(
  db: Database,
  seasonId: string,
) {
  const matchupRows = await db
    .select({
      id: schema.playoffMatchup.id,
      label: schema.playoffMatchup.label,
      category: schema.category.name,
      bestOf: schema.playoffMatchup.bestOf,
      eventId: schema.playoffMatchup.eventId,
      courtId: schema.playoffMatchup.courtId,
      slotIndex: schema.playoffMatchup.slotIndex,
    })
    .from(schema.playoffMatchup)
    .innerJoin(schema.category, eq(schema.playoffMatchup.categoryId, schema.category.id))
    .leftJoin(
      schema.playoffScheduleEvent,
      eq(schema.playoffMatchup.eventId, schema.playoffScheduleEvent.id),
    )
    .where(eq(schema.playoffMatchup.seasonId, seasonId))
    .orderBy(
      sql`(${schema.playoffScheduleEvent.startTime} IS NULL) ASC`,
      asc(schema.playoffScheduleEvent.startTime),
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
            teamName: schema.team.name,
            teamLogoUrl: schema.team.logoUrl,
            label: schema.playoffMatchupTeam.label,
            dependencyType: schema.playoffMatchupTeam.dependencyType,
          })
          .from(schema.playoffMatchupTeam)
          .leftJoin(schema.team, eq(schema.playoffMatchupTeam.teamId, schema.team.id))
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

type PlayoffScheduleData = {
  seasonId: string;
  events: { id: string; name: string; date: string; startTime?: string }[];
  matchups: {
    id: string;
    eventId: string | null;
    courtId: string | null;
    slotIndex: number | null;
  }[];
};

export async function savePlayoffSchedule(db: Database, data: PlayoffScheduleData) {
  const { seasonId, events, matchups } = data;

  const existingEvents = await getPlayoffScheduleEventsBySeasonId(db, seasonId);
  const existingEventIds = new Set(existingEvents.map((event) => event.id));
  const nextEventIds = new Set(events.map((event) => event.id));

  for (const existingEvent of existingEvents) {
    if (!nextEventIds.has(existingEvent.id)) {
      await deletePlayoffScheduleEvent(db, existingEvent.id);
    }
  }

  for (const event of events) {
    if (existingEventIds.has(event.id)) {
      await updatePlayoffScheduleEvent(db, event.id, {
        name: event.name,
        date: event.date,
      });
    } else {
      await db.insert(schema.playoffScheduleEvent).values({
        id: event.id,
        name: event.name,
        startTime: event.date,
        seasonId,
      });
    }
  }

  for (const matchup of matchups) {
    await db
      .update(schema.playoffMatchup)
      .set({
        eventId: matchup.eventId,
        courtId: matchup.courtId,
        slotIndex: matchup.slotIndex,
      })
      .where(
        and(
          eq(schema.playoffMatchup.id, matchup.id),
          eq(schema.playoffMatchup.seasonId, seasonId),
        ),
      );
  }
}

export async function autoSchedulePlayoffMatchups(db: Database, seasonId: string) {
  const [events, matchups, dependencyRows] = await Promise.all([
    getPlayoffScheduleEventsBySeasonId(db, seasonId),
    db
      .select({
        id: schema.playoffMatchup.id,
        round: schema.playoffMatchup.round,
        label: schema.playoffMatchup.label,
        categoryId: schema.playoffMatchup.categoryId,
      })
      .from(schema.playoffMatchup)
      .where(eq(schema.playoffMatchup.seasonId, seasonId)),
    db
      .select({
        matchupId: schema.playoffMatchupTeam.matchupId,
        dependsOn: schema.playoffMatchupTeam.dependsOn,
      })
      .from(schema.playoffMatchupTeam)
      .innerJoin(
        schema.playoffMatchup,
        eq(schema.playoffMatchupTeam.matchupId, schema.playoffMatchup.id),
      )
      .where(eq(schema.playoffMatchup.seasonId, seasonId)),
  ]);

  const orderedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));
  if (orderedEvents.length === 0 || matchups.length === 0) {
    return {
      scheduledCount: 0,
      unscheduledCount: matchups.length,
    };
  }

  const dependenciesByMatchupId = dependencyRows.reduce((acc, row) => {
    if (!row.dependsOn) return acc;
    const dependencies = acc.get(row.matchupId) ?? new Set<string>();
    dependencies.add(row.dependsOn);
    acc.set(row.matchupId, dependencies);
    return acc;
  }, new Map<string, Set<string>>());

  const eventIndexByMatchupId = new Map<string, number>();
  const courtSlotCounts = new Map<string, number>();
  const scheduledMatchupIds = new Set<string>();
  const courts = ["A", "B"] as const;
  const lastEventIndex = orderedEvents.length - 1;
  const lastEvent = orderedEvents[lastEventIndex];

  const lastDayMatchups = [...matchups].sort(comparePlayoffLastDayMatchups);
  if (lastEvent) {
    for (const matchup of lastDayMatchups) {
      if (!isLastDayPlayoffMatchup(matchup)) continue;

      const countKey = `${lastEvent.id}:B`;
      const slotIndex = courtSlotCounts.get(countKey) ?? 0;

      await db
        .update(schema.playoffMatchup)
        .set({
          eventId: lastEvent.id,
          courtId: "B",
          slotIndex,
        })
        .where(eq(schema.playoffMatchup.id, matchup.id));

      courtSlotCounts.set(countKey, slotIndex + 1);
      eventIndexByMatchupId.set(matchup.id, lastEventIndex);
      scheduledMatchupIds.add(matchup.id);
    }
  }

  const orderedMatchups = [...matchups].sort((a, b) => {
    const roundA = PLAYOFF_ROUND_ORDER.indexOf(a.round);
    const roundB = PLAYOFF_ROUND_ORDER.indexOf(b.round);
    const normalizedRoundA = roundA === -1 ? PLAYOFF_ROUND_ORDER.length : roundA;
    const normalizedRoundB = roundB === -1 ? PLAYOFF_ROUND_ORDER.length : roundB;

    if (normalizedRoundA !== normalizedRoundB) return normalizedRoundA - normalizedRoundB;
    if (a.categoryId !== b.categoryId) return a.categoryId.localeCompare(b.categoryId);
    return a.label.localeCompare(b.label, undefined, { numeric: true });
  });

  for (const matchup of orderedMatchups) {
    if (scheduledMatchupIds.has(matchup.id)) continue;

    const dependencyEventIndexes = [...(dependenciesByMatchupId.get(matchup.id) ?? [])]
      .map((dependencyId) => eventIndexByMatchupId.get(dependencyId))
      .filter((eventIndex): eventIndex is number => eventIndex !== undefined);

    const minimumDependencyEventIndex =
      dependencyEventIndexes.length > 0 ? Math.max(...dependencyEventIndexes) : 0;
    const preferredEventIndex = PLAYOFF_ROUND_EVENT_INDEX[matchup.round] ?? 0;
    const eventIndex = Math.min(
      Math.max(preferredEventIndex, minimumDependencyEventIndex),
      orderedEvents.length - 1,
    );
    const courtId = courts[scheduledMatchupIds.size % courts.length];
    const countKey = `${orderedEvents[eventIndex]?.id}:${courtId}`;
    const slotIndex = courtSlotCounts.get(countKey) ?? 0;

    const event = orderedEvents[eventIndex];
    if (!event) continue;

    await db
      .update(schema.playoffMatchup)
      .set({
        eventId: event.id,
        courtId,
        slotIndex,
      })
      .where(eq(schema.playoffMatchup.id, matchup.id));

    courtSlotCounts.set(countKey, slotIndex + 1);
    eventIndexByMatchupId.set(matchup.id, eventIndex);
    scheduledMatchupIds.add(matchup.id);
  }

  const scheduledCount = scheduledMatchupIds.size;
  return {
    scheduledCount,
    unscheduledCount: matchups.length - scheduledCount,
  };
}

function isLastDayPlayoffMatchup(matchup: { categoryId: string; round: string }) {
  if (matchup.round === "final") {
    return PLAYOFF_LAST_DAY_CATEGORY_ORDER.includes(matchup.categoryId);
  }

  return matchup.categoryId === CAT_VARONIL_LIBRE && matchup.round === "third-place";
}

function comparePlayoffLastDayMatchups(
  a: { categoryId: string; round: string; label: string },
  b: { categoryId: string; round: string; label: string },
) {
  const rankA = getPlayoffLastDayRank(a);
  const rankB = getPlayoffLastDayRank(b);

  if (rankA !== rankB) return rankA - rankB;
  return a.label.localeCompare(b.label, undefined, { numeric: true });
}

function getPlayoffLastDayRank(matchup: { categoryId: string; round: string }) {
  if (matchup.categoryId === CAT_FEMENIL && matchup.round === "final") return 0;
  if (matchup.categoryId === CAT_SEGUNDA_FUERZA && matchup.round === "final") {
    return 1;
  }
  if (matchup.categoryId === CAT_VARONIL_LIBRE && matchup.round === "third-place") {
    return 2;
  }
  if (matchup.categoryId === CAT_VARONIL_LIBRE && matchup.round === "final") return 3;
  return 99;
}

export async function getPlayoffGraph(
  db: Database,
  params: { seasonId: string; categoryId: string },
) {
  const [matchups, matchupTeams, points] = await Promise.all([
    db
      .select({
        id: schema.playoffMatchup.id,
        seasonId: schema.playoffMatchup.seasonId,
        categoryId: schema.playoffMatchup.categoryId,
        categoryName: schema.category.name,
        label: schema.playoffMatchup.label,
        round: schema.playoffMatchup.round,
        bestOf: schema.playoffMatchup.bestOf,
        eventId: schema.playoffMatchup.eventId,
        eventName: schema.playoffScheduleEvent.name,
        eventStartTime: schema.playoffScheduleEvent.startTime,
        courtId: schema.playoffMatchup.courtId,
        duration: schema.playoffMatchup.duration,
      })
      .from(schema.playoffMatchup)
      .innerJoin(
        schema.category,
        eq(schema.playoffMatchup.categoryId, schema.category.id),
      )
      .leftJoin(
        schema.playoffScheduleEvent,
        eq(schema.playoffMatchup.eventId, schema.playoffScheduleEvent.id),
      )
      .where(
        and(
          eq(schema.playoffMatchup.seasonId, params.seasonId),
          eq(schema.playoffMatchup.categoryId, params.categoryId),
        ),
      )
      .orderBy(asc(schema.playoffMatchup.round), asc(schema.playoffMatchup.label)),
    db
      .select({
        id: schema.playoffMatchupTeam.id,
        matchupId: schema.playoffMatchupTeam.matchupId,
        slotIndex: schema.playoffMatchupTeam.slotIndex,
        teamId: schema.playoffMatchupTeam.teamId,
        teamName: schema.team.name,
        teamLogoUrl: schema.team.logoUrl,
        label: schema.playoffMatchupTeam.label,
        dependsOn: schema.playoffMatchupTeam.dependsOn,
        dependencyType: schema.playoffMatchupTeam.dependencyType,
      })
      .from(schema.playoffMatchupTeam)
      .innerJoin(
        schema.playoffMatchup,
        eq(schema.playoffMatchupTeam.matchupId, schema.playoffMatchup.id),
      )
      .leftJoin(schema.team, eq(schema.playoffMatchupTeam.teamId, schema.team.id))
      .where(
        and(
          eq(schema.playoffMatchup.seasonId, params.seasonId),
          eq(schema.playoffMatchup.categoryId, params.categoryId),
        ),
      )
      .orderBy(
        asc(schema.playoffMatchupTeam.matchupId),
        asc(schema.playoffMatchupTeam.slotIndex),
      ),
    db
      .select({
        matchupId: schema.playoffPoint.matchupId,
        teamId: schema.playoffPoint.teamId,
        set: schema.playoffPoint.set,
        points: schema.playoffPoint.points,
      })
      .from(schema.playoffPoint)
      .innerJoin(
        schema.playoffMatchup,
        eq(schema.playoffPoint.matchupId, schema.playoffMatchup.id),
      )
      .where(
        and(
          eq(schema.playoffMatchup.seasonId, params.seasonId),
          eq(schema.playoffMatchup.categoryId, params.categoryId),
        ),
      ),
  ]);

  const teamsByMatchupId = new Map<string, typeof matchupTeams>();
  for (const team of matchupTeams) {
    const existing = teamsByMatchupId.get(team.matchupId) ?? [];
    existing.push(team);
    teamsByMatchupId.set(team.matchupId, existing);
  }

  const pointsByMatchupId = new Map<string, typeof points>();
  for (const point of points) {
    const existing = pointsByMatchupId.get(point.matchupId) ?? [];
    existing.push(point);
    pointsByMatchupId.set(point.matchupId, existing);
  }

  return {
    hasGraph: matchups.length > 0,
    matchups: matchups.map((matchup) => ({
      ...matchup,
      teams: teamsByMatchupId.get(matchup.id) ?? [],
      points: pointsByMatchupId.get(matchup.id) ?? [],
    })),
  };
}

export async function getPlayoffGraphsBySeason(db: Database, seasonId: string) {
  const [categories, matchups, matchupTeams, points] = await Promise.all([
    getCategories(db),
    db
      .select({
        id: schema.playoffMatchup.id,
        seasonId: schema.playoffMatchup.seasonId,
        categoryId: schema.playoffMatchup.categoryId,
        categoryName: schema.category.name,
        label: schema.playoffMatchup.label,
        round: schema.playoffMatchup.round,
        bestOf: schema.playoffMatchup.bestOf,
        eventId: schema.playoffMatchup.eventId,
        eventName: schema.playoffScheduleEvent.name,
        eventStartTime: schema.playoffScheduleEvent.startTime,
        courtId: schema.playoffMatchup.courtId,
        duration: schema.playoffMatchup.duration,
      })
      .from(schema.playoffMatchup)
      .innerJoin(
        schema.category,
        eq(schema.playoffMatchup.categoryId, schema.category.id),
      )
      .leftJoin(
        schema.playoffScheduleEvent,
        eq(schema.playoffMatchup.eventId, schema.playoffScheduleEvent.id),
      )
      .where(eq(schema.playoffMatchup.seasonId, seasonId))
      .orderBy(
        asc(schema.playoffMatchup.categoryId),
        asc(schema.playoffMatchup.round),
        asc(schema.playoffMatchup.label),
      ),
    db
      .select({
        id: schema.playoffMatchupTeam.id,
        matchupId: schema.playoffMatchupTeam.matchupId,
        slotIndex: schema.playoffMatchupTeam.slotIndex,
        teamId: schema.playoffMatchupTeam.teamId,
        teamName: schema.team.name,
        teamLogoUrl: schema.team.logoUrl,
        label: schema.playoffMatchupTeam.label,
        dependsOn: schema.playoffMatchupTeam.dependsOn,
        dependencyType: schema.playoffMatchupTeam.dependencyType,
      })
      .from(schema.playoffMatchupTeam)
      .innerJoin(
        schema.playoffMatchup,
        eq(schema.playoffMatchupTeam.matchupId, schema.playoffMatchup.id),
      )
      .leftJoin(schema.team, eq(schema.playoffMatchupTeam.teamId, schema.team.id))
      .where(eq(schema.playoffMatchup.seasonId, seasonId))
      .orderBy(
        asc(schema.playoffMatchupTeam.matchupId),
        asc(schema.playoffMatchupTeam.slotIndex),
      ),
    db
      .select({
        matchupId: schema.playoffPoint.matchupId,
        teamId: schema.playoffPoint.teamId,
        set: schema.playoffPoint.set,
        points: schema.playoffPoint.points,
        categoryId: schema.playoffMatchup.categoryId,
      })
      .from(schema.playoffPoint)
      .innerJoin(
        schema.playoffMatchup,
        eq(schema.playoffPoint.matchupId, schema.playoffMatchup.id),
      )
      .where(eq(schema.playoffMatchup.seasonId, seasonId)),
  ]);

  const teamsByMatchupId = new Map<string, typeof matchupTeams>();
  for (const team of matchupTeams) {
    const existing = teamsByMatchupId.get(team.matchupId) ?? [];
    existing.push(team);
    teamsByMatchupId.set(team.matchupId, existing);
  }

  const pointsByMatchupId = new Map<string, typeof points>();
  const categoryIdsWithScores = new Set<string>();
  for (const point of points) {
    categoryIdsWithScores.add(point.categoryId);
    const existing = pointsByMatchupId.get(point.matchupId) ?? [];
    existing.push(point);
    pointsByMatchupId.set(point.matchupId, existing);
  }

  const matchupsByCategoryId = new Map<string, typeof matchups>();
  for (const matchup of matchups) {
    const existing = matchupsByCategoryId.get(matchup.categoryId) ?? [];
    existing.push(matchup);
    matchupsByCategoryId.set(matchup.categoryId, existing);
  }

  return {
    categories,
    graphs: categories.map((category) => {
      const categoryMatchups = matchupsByCategoryId.get(category.id) ?? [];

      return {
        category,
        graph: {
          hasGraph: categoryMatchups.length > 0,
          hasScores: categoryIdsWithScores.has(category.id),
          matchups: categoryMatchups.map((matchup) => ({
            ...matchup,
            teams: teamsByMatchupId.get(matchup.id) ?? [],
            points: pointsByMatchupId.get(matchup.id) ?? [],
          })),
        },
      };
    }),
  };
}

export async function hasPlayoffGraph(
  db: Database,
  params: { seasonId: string; categoryId: string },
) {
  const [matchup] = await db
    .select({ id: schema.playoffMatchup.id })
    .from(schema.playoffMatchup)
    .where(
      and(
        eq(schema.playoffMatchup.seasonId, params.seasonId),
        eq(schema.playoffMatchup.categoryId, params.categoryId),
      ),
    )
    .limit(1);

  return Boolean(matchup);
}

export async function hasPlayoffScores(
  db: Database,
  params: { seasonId: string; categoryId: string },
) {
  const [point] = await db
    .select({ matchupId: schema.playoffPoint.matchupId })
    .from(schema.playoffPoint)
    .innerJoin(
      schema.playoffMatchup,
      eq(schema.playoffPoint.matchupId, schema.playoffMatchup.id),
    )
    .where(
      and(
        eq(schema.playoffMatchup.seasonId, params.seasonId),
        eq(schema.playoffMatchup.categoryId, params.categoryId),
      ),
    )
    .limit(1);

  return Boolean(point);
}

export async function getPlayoffEventMatchupsWithScores(db: Database, eventId: string) {
  const [event] = await db
    .select({
      id: schema.playoffScheduleEvent.id,
      name: schema.playoffScheduleEvent.name,
      date: schema.playoffScheduleEvent.startTime,
      seasonId: schema.playoffScheduleEvent.seasonId,
    })
    .from(schema.playoffScheduleEvent)
    .where(eq(schema.playoffScheduleEvent.id, eventId))
    .limit(1);

  if (!event) return null;

  const matchups = await getPlayoffScheduleMatchupsBySeasonId(db, event.seasonId);
  const eventMatchups = matchups
    .filter((matchup) => matchup.eventId === eventId)
    .sort((a, b) => {
      const slotCompare = (a.slotIndex ?? 999) - (b.slotIndex ?? 999);
      if (slotCompare !== 0) return slotCompare;
      return (a.courtId ?? "Z").localeCompare(b.courtId ?? "Z");
    });

  const matchupIds = eventMatchups.map((matchup) => matchup.id);
  const pointRows =
    matchupIds.length > 0
      ? await db
          .select({
            matchupId: schema.playoffPoint.matchupId,
            teamId: schema.playoffPoint.teamId,
            set: schema.playoffPoint.set,
            points: schema.playoffPoint.points,
          })
          .from(schema.playoffPoint)
          .where(inArray(schema.playoffPoint.matchupId, matchupIds))
      : [];

  const pointsByMatchupId = pointRows.reduce((acc, point) => {
    const existing = acc.get(point.matchupId) ?? [];
    existing.push(point);
    acc.set(point.matchupId, existing);
    return acc;
  }, new Map<string, typeof pointRows>());

  return {
    event,
    matchups: eventMatchups.map((matchup) => ({
      ...matchup,
      points: pointsByMatchupId.get(matchup.id) ?? [],
    })),
  };
}

export async function getPlayoffEventsWithMatchupsBySeasonId(
  db: Database,
  seasonId: string,
) {
  const events = await db
    .select({
      id: schema.playoffScheduleEvent.id,
      name: schema.playoffScheduleEvent.name,
      date: schema.playoffScheduleEvent.startTime,
      seasonId: schema.playoffScheduleEvent.seasonId,
      seasonName: schema.season.name,
    })
    .from(schema.playoffScheduleEvent)
    .innerJoin(schema.season, eq(schema.playoffScheduleEvent.seasonId, schema.season.id))
    .where(eq(schema.playoffScheduleEvent.seasonId, seasonId))
    .orderBy(asc(schema.playoffScheduleEvent.startTime));

  if (events.length === 0) {
    return [];
  }

  const seasonMatchups = await getPlayoffScheduleMatchupsBySeasonId(db, seasonId);
  const matchupsByEventId = new Map<string, typeof seasonMatchups>();

  for (const matchup of seasonMatchups) {
    if (!matchup.eventId) continue;
    const existing = matchupsByEventId.get(matchup.eventId) ?? [];
    existing.push(matchup);
    matchupsByEventId.set(matchup.eventId, existing);
  }

  return events.map((event) => {
    const eventMatchups = [...(matchupsByEventId.get(event.id) ?? [])].sort((a, b) => {
      const slotCompare = (a.slotIndex ?? 999) - (b.slotIndex ?? 999);
      if (slotCompare !== 0) return slotCompare;
      return (a.courtId ?? "Z").localeCompare(b.courtId ?? "Z");
    });

    return {
      id: event.id,
      name: event.name,
      date: event.date,
      season: {
        id: event.seasonId,
        name: event.seasonName,
      },
      matchups: eventMatchups.map((matchup) => {
        const teams = [...matchup.teams].sort((a, b) => a.slotIndex - b.slotIndex);
        const teamA = teams[0];
        const teamB = teams[1];

        return {
          id: matchup.id,
          label: teamA?.teamId && teamB?.teamId ? undefined : matchup.label,
          teamA: {
            name: teamA?.teamName ?? teamA?.label ?? "TBD",
            logoUrl: teamA?.teamLogoUrl ?? "",
            isPlaceholder: !teamA?.teamId,
          },
          teamB: {
            name: teamB?.teamName ?? teamB?.label ?? "TBD",
            logoUrl: teamB?.teamLogoUrl ?? "",
            isPlaceholder: !teamB?.teamId,
          },
          category: matchup.category,
          courtId: matchup.courtId,
          slotIndex: matchup.slotIndex,
        };
      }),
    } satisfies EventWithMatchups;
  });
}

export async function savePlayoffSetScore(
  db: Database,
  params: {
    seasonId: string;
    matchupId: string;
    teamId: string;
    set: number;
    points: number;
  },
) {
  const [matchupRow] = await db
    .select({
      id: schema.playoffMatchup.id,
      seasonId: schema.playoffMatchup.seasonId,
      bestOf: schema.playoffMatchup.bestOf,
    })
    .from(schema.playoffMatchup)
    .where(eq(schema.playoffMatchup.id, params.matchupId))
    .limit(1);

  if (!matchupRow || matchupRow.seasonId !== params.seasonId) {
    throw new Error("Playoff matchup not found");
  }

  const teams = await db
    .select({
      id: schema.playoffMatchupTeam.id,
      teamId: schema.playoffMatchupTeam.teamId,
    })
    .from(schema.playoffMatchupTeam)
    .where(eq(schema.playoffMatchupTeam.matchupId, params.matchupId));

  if (!teams.some((team) => team.teamId === params.teamId)) {
    throw new Error("Invalid playoff team");
  }

  await db
    .insert(schema.playoffPoint)
    .values({
      matchupId: params.matchupId,
      seasonId: params.seasonId,
      teamId: params.teamId,
      set: params.set,
      points: params.points,
    })
    .onConflictDoUpdate({
      target: [
        schema.playoffPoint.matchupId,
        schema.playoffPoint.teamId,
        schema.playoffPoint.set,
      ],
      set: { points: params.points },
    });

  await updateDependentPlayoffSlots(db, {
    seasonId: params.seasonId,
    matchupId: params.matchupId,
    bestOf: matchupRow.bestOf,
    teams,
  });
}

async function updateDependentPlayoffSlots(
  db: Database,
  params: {
    seasonId: string;
    matchupId: string;
    bestOf: number;
    teams: { teamId: string | null }[];
  },
) {
  const points = await db
    .select({
      teamId: schema.playoffPoint.teamId,
      set: schema.playoffPoint.set,
      points: schema.playoffPoint.points,
    })
    .from(schema.playoffPoint)
    .where(eq(schema.playoffPoint.matchupId, params.matchupId));

  const winner = calculatePlayoffWinner({
    bestOf: params.bestOf,
    teams: params.teams,
    points,
  });

  const dependentSlots = await db
    .select({
      id: schema.playoffMatchupTeam.id,
      dependencyType: schema.playoffMatchupTeam.dependencyType,
    })
    .from(schema.playoffMatchupTeam)
    .innerJoin(
      schema.playoffMatchup,
      eq(schema.playoffMatchupTeam.matchupId, schema.playoffMatchup.id),
    )
    .where(
      and(
        eq(schema.playoffMatchup.seasonId, params.seasonId),
        eq(schema.playoffMatchupTeam.dependsOn, params.matchupId),
      ),
    );

  for (const slot of dependentSlots) {
    const teamId =
      slot.dependencyType === "loser"
        ? (winner?.loserTeamId ?? null)
        : (winner?.winnerTeamId ?? null);

    await db
      .update(schema.playoffMatchupTeam)
      .set({ teamId })
      .where(eq(schema.playoffMatchupTeam.id, slot.id));
  }
}

export async function clearPlayoffGraph(
  db: Database,
  params: { seasonId: string; categoryId: string },
) {
  if (await hasPlayoffScores(db, params)) {
    throw new Error("Cannot clear playoff graph after scores have been entered");
  }

  await db
    .delete(schema.playoffMatchup)
    .where(
      and(
        eq(schema.playoffMatchup.seasonId, params.seasonId),
        eq(schema.playoffMatchup.categoryId, params.categoryId),
      ),
    );
}

export async function generatePlayoffGraph(
  db: Database,
  params: {
    seasonId: string;
    categoryId: string;
    format: PlayoffFormat;
  },
) {
  if (await hasPlayoffGraph(db, params)) {
    throw new Error("Playoff graph already exists for this category");
  }

  const generated = await buildPlayoffGraphFromStandings(db, params);

  await db
    .update(schema.category)
    .set({ playoffFormat: params.format })
    .where(eq(schema.category.id, params.categoryId));
  await db.insert(schema.playoffMatchup).values(generated.matchups);
  await db.insert(schema.playoffMatchupTeam).values(generated.teams);

  return {
    matchupsGenerated: generated.matchups.length,
    slotsGenerated: generated.teams.length,
  };
}

async function buildPlayoffGraphFromStandings(
  db: Database,
  params: {
    seasonId: string;
    categoryId: string;
    format: PlayoffFormat;
  },
): Promise<PlayoffTemplate> {
  const category = await getCategoryById(db, params.categoryId);
  if (!category) {
    throw new Error("Category not found");
  }

  const standings = await getStandingsBySeasonId(db, params.seasonId);
  const categoryStandings = standings.find((item) => item.category === category.name);
  if (!categoryStandings) {
    throw new Error("No standings found for this category");
  }

  const sections = categoryStandings.sections.filter((section) => section.groupName);
  if (sections.length !== 2) {
    throw new Error("Playoff generation currently requires exactly two groups");
  }

  const [groupA, groupB] = sections.map((section) => ({
    name: section.groupName!,
    teams: section.teams,
  }));

  const seedCount = Math.min(groupA.teams.length, groupB.teams.length);
  if (params.format === "top-5" && seedCount >= 5) {
    return buildTopFiveTemplate(params, groupA, groupB);
  }
  if (params.format === "top-4" && seedCount >= 4) {
    return buildTopFourTemplate(params, groupA, groupB);
  }

  throw new Error(
    params.format === "top-5"
      ? "Top 5 playoff generation requires at least five teams per group"
      : "Top 4 playoff generation requires at least four teams per group",
  );
}

function buildSeeds(groupName: string, teams: TeamStanding[], count: number): Seed[] {
  return teams.slice(0, count).map((team, index) => ({
    teamId: team.teamId,
    label: `${groupName}${index + 1}`,
    rank: index + 1,
    groupName,
  }));
}

function buildTopFourTemplate(
  params: { seasonId: string; categoryId: string },
  groupA: { name: string; teams: TeamStanding[] },
  groupB: { name: string; teams: TeamStanding[] },
): PlayoffTemplate {
  const a = buildSeeds(groupA.name, groupA.teams, 4);
  const b = buildSeeds(groupB.name, groupB.teams, 4);
  const qf1 = matchup(params, "QF 1", "quarter-final");
  const qf2 = matchup(params, "QF 2", "quarter-final");
  const qf3 = matchup(params, "QF 3", "quarter-final");
  const qf4 = matchup(params, "QF 4", "quarter-final");
  const sf1 = matchup(params, "Semifinal 1", "semifinal");
  const sf2 = matchup(params, "Semifinal 2", "semifinal");
  const thirdPlace = matchup(params, "Tercer Lugar", "third-place");
  const final = matchup(params, "Final", "final");

  return {
    matchups: [qf1, qf2, qf3, qf4, sf1, sf2, thirdPlace, final],
    teams: [
      concreteSlot(qf1.id, 0, a[0]),
      concreteSlot(qf1.id, 1, b[3]),
      concreteSlot(qf2.id, 0, b[1]),
      concreteSlot(qf2.id, 1, a[2]),
      concreteSlot(qf3.id, 0, a[1]),
      concreteSlot(qf3.id, 1, b[2]),
      concreteSlot(qf4.id, 0, b[0]),
      concreteSlot(qf4.id, 1, a[3]),
      dependencySlot(sf1.id, 0, "Winner QF 1", qf1.id),
      dependencySlot(sf1.id, 1, "Winner QF 2", qf2.id),
      dependencySlot(sf2.id, 0, "Winner QF 3", qf3.id),
      dependencySlot(sf2.id, 1, "Winner QF 4", qf4.id),
      dependencySlot(thirdPlace.id, 0, "Loser Semifinal 1", sf1.id, "loser"),
      dependencySlot(thirdPlace.id, 1, "Loser Semifinal 2", sf2.id, "loser"),
      dependencySlot(final.id, 0, "Winner Semifinal 1", sf1.id),
      dependencySlot(final.id, 1, "Winner Semifinal 2", sf2.id),
    ],
  };
}

function buildTopFiveTemplate(
  params: { seasonId: string; categoryId: string },
  groupA: { name: string; teams: TeamStanding[] },
  groupB: { name: string; teams: TeamStanding[] },
): PlayoffTemplate {
  const a = buildSeeds(groupA.name, groupA.teams, 5);
  const b = buildSeeds(groupB.name, groupB.teams, 5);
  const m1 = matchup(params, "Match 1", "play-in", 2);
  const m2 = matchup(params, "Match 2", "play-in", 2);
  const qf1 = matchup(params, "QF 1", "quarter-final");
  const qf2 = matchup(params, "QF 2", "quarter-final");
  const qf3 = matchup(params, "QF 3", "quarter-final");
  const qf4 = matchup(params, "QF 4", "quarter-final");
  const sf1 = matchup(params, "Semifinal 1", "semifinal");
  const sf2 = matchup(params, "Semifinal 2", "semifinal");
  const thirdPlace = matchup(params, "Tercer Lugar", "third-place");
  const final = matchup(params, "Final", "final");

  return {
    matchups: [m1, m2, qf1, qf2, qf3, qf4, sf1, sf2, thirdPlace, final],
    teams: [
      concreteSlot(m1.id, 0, a[3]),
      concreteSlot(m1.id, 1, b[4]),
      concreteSlot(m2.id, 0, b[3]),
      concreteSlot(m2.id, 1, a[4]),
      concreteSlot(qf1.id, 0, a[0]),
      dependencySlot(qf1.id, 1, "Winner M1", m1.id),
      concreteSlot(qf2.id, 0, b[1]),
      concreteSlot(qf2.id, 1, a[2]),
      dependencySlot(qf3.id, 0, "Winner M2", m2.id),
      concreteSlot(qf3.id, 1, b[0]),
      concreteSlot(qf4.id, 0, a[1]),
      concreteSlot(qf4.id, 1, b[2]),
      dependencySlot(sf1.id, 0, "Winner QF 1", qf1.id),
      dependencySlot(sf1.id, 1, "Winner QF 2", qf2.id),
      dependencySlot(sf2.id, 0, "Winner QF 3", qf3.id),
      dependencySlot(sf2.id, 1, "Winner QF 4", qf4.id),
      dependencySlot(thirdPlace.id, 0, "Loser Semifinal 1", sf1.id, "loser"),
      dependencySlot(thirdPlace.id, 1, "Loser Semifinal 2", sf2.id, "loser"),
      dependencySlot(final.id, 0, "Winner Semifinal 1", sf1.id),
      dependencySlot(final.id, 1, "Winner Semifinal 2", sf2.id),
    ],
  };
}

function matchup(
  params: { seasonId: string; categoryId: string },
  label: string,
  round: string,
  bestOf = 3,
): GeneratedMatchup {
  return {
    id: uuidv4(),
    seasonId: params.seasonId,
    categoryId: params.categoryId,
    label,
    round,
    bestOf,
    duration: 60,
  };
}

function concreteSlot(
  matchupId: string,
  slotIndex: number,
  seed: Seed,
): GeneratedMatchupTeam {
  return {
    id: uuidv4(),
    matchupId,
    slotIndex,
    teamId: seed.teamId,
    label: seed.label,
    dependsOn: null,
    dependencyType: "winner",
  };
}

function dependencySlot(
  matchupId: string,
  slotIndex: number,
  label: string,
  dependsOn: string,
  dependencyType: PlayoffDependencyType = "winner",
): GeneratedMatchupTeam {
  return {
    id: uuidv4(),
    matchupId,
    slotIndex,
    teamId: null,
    label,
    dependsOn,
    dependencyType,
  };
}
