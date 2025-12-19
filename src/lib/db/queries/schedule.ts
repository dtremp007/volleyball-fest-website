import { and, asc, eq, gte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";

// ============== Events ==============

export async function getEventsBySeasonId(db: Database, seasonId: string) {
  return await db
    .select({
      id: schema.scheduleEvent.id,
      name: schema.scheduleEvent.name,
      date: schema.scheduleEvent.date,
      seasonId: schema.scheduleEvent.seasonId,
    })
    .from(schema.scheduleEvent)
    .where(eq(schema.scheduleEvent.seasonId, seasonId));
}

export async function createEvent(
  db: Database,
  params: { name: string; date: string; seasonId: string },
) {
  const id = uuidv4();
  await db.insert(schema.scheduleEvent).values({ id, ...params });
  return { id, ...params };
}

export async function updateEvent(
  db: Database,
  id: string,
  params: { name?: string; date?: string },
) {
  await db
    .update(schema.scheduleEvent)
    .set(params)
    .where(eq(schema.scheduleEvent.id, id));
}

export async function deleteEvent(db: Database, id: string) {
  // First unschedule all matchups for this event
  await db
    .update(schema.matchup)
    .set({ eventId: null, courtId: null, slotIndex: null })
    .where(eq(schema.matchup.eventId, id));

  // Then delete the event
  await db.delete(schema.scheduleEvent).where(eq(schema.scheduleEvent.id, id));
}

// ============== Matchups ==============

export async function getMatchupsBySeasonId(db: Database, seasonId: string) {
  const matchups = await db
    .select({
      id: schema.matchup.id,
      teamAId: schema.matchup.teamAId,
      teamBId: schema.matchup.teamBId,
      seasonId: schema.matchup.seasonId,
      eventId: schema.matchup.eventId,
      courtId: schema.matchup.courtId,
      slotIndex: schema.matchup.slotIndex,
      teamAName: schema.team.name,
      teamALogo: schema.team.logoUrl,
    })
    .from(schema.matchup)
    .innerJoin(schema.team, eq(schema.matchup.teamAId, schema.team.id))
    .where(eq(schema.matchup.seasonId, seasonId));

  // Get team B info in a second query (drizzle limitation with multiple joins to same table)
  const teamBInfo = await db
    .select({
      matchupId: schema.matchup.id,
      teamBName: schema.team.name,
      teamBLogo: schema.team.logoUrl,
      category: schema.category.name,
    })
    .from(schema.matchup)
    .innerJoin(schema.team, eq(schema.matchup.teamBId, schema.team.id))
    .innerJoin(schema.category, eq(schema.team.categoryId, schema.category.id))
    .where(eq(schema.matchup.seasonId, seasonId));

  const teamBMap = new Map(teamBInfo.map((t) => [t.matchupId, t]));

  return matchups.map((m) => {
    const teamB = teamBMap.get(m.id);
    return {
      id: m.id,
      teamA: { id: m.teamAId, name: m.teamAName, logoUrl: m.teamALogo },
      teamB: { id: m.teamBId, name: teamB?.teamBName ?? "", logoUrl: teamB?.teamBLogo ?? "" },
      category: teamB?.category ?? "",
      seasonId: m.seasonId,
      eventId: m.eventId,
      courtId: m.courtId,
      slotIndex: m.slotIndex,
    };
  });
}

export async function generateMatchupsForSeason(db: Database, seasonId: string) {
  // Get all teams for this season grouped by category
  const teams = await db
    .select({
      id: schema.team.id,
      name: schema.team.name,
      logoUrl: schema.team.logoUrl,
      categoryId: schema.team.categoryId,
      category: schema.category.name,
    })
    .from(schema.team)
    .innerJoin(schema.seasonTeam, eq(schema.team.id, schema.seasonTeam.teamId))
    .innerJoin(schema.category, eq(schema.team.categoryId, schema.category.id))
    .where(eq(schema.seasonTeam.seasonId, seasonId));

  // Group teams by category
  const teamsByCategory = teams.reduce(
    (acc, team) => {
      if (!acc[team.category]) acc[team.category] = [];
      acc[team.category].push(team);
      return acc;
    },
    {} as Record<string, typeof teams>,
  );

  // Generate round-robin matchups for each category
  const matchupsToInsert: {
    id: string;
    teamAId: string;
    teamBId: string;
    seasonId: string;
  }[] = [];

  for (const categoryTeams of Object.values(teamsByCategory)) {
    for (let i = 0; i < categoryTeams.length; i++) {
      for (let j = i + 1; j < categoryTeams.length; j++) {
        matchupsToInsert.push({
          id: uuidv4(),
          teamAId: categoryTeams[i].id,
          teamBId: categoryTeams[j].id,
          seasonId,
        });
      }
    }
  }

  if (matchupsToInsert.length > 0) {
    await db.insert(schema.matchup).values(matchupsToInsert);
  }

  return matchupsToInsert.length;
}

export async function hasMatchupsForSeason(db: Database, seasonId: string) {
  const result = await db
    .select({ id: schema.matchup.id })
    .from(schema.matchup)
    .where(eq(schema.matchup.seasonId, seasonId))
    .limit(1);

  return result.length > 0;
}

export async function deleteMatchupsForSeason(db: Database, seasonId: string) {
  await db.delete(schema.matchup).where(eq(schema.matchup.seasonId, seasonId));
}

// ============== Bulk Save ==============

type ScheduleData = {
  seasonId: string;
  events: { id: string; name: string; date: string }[];
  matchups: {
    id: string;
    eventId: string | null;
    courtId: string | null;
    slotIndex: number | null;
  }[];
};

export async function saveSchedule(db: Database, data: ScheduleData) {
  const { seasonId, events, matchups } = data;

  // Get existing events for this season
  const existingEvents = await getEventsBySeasonId(db, seasonId);
  const existingEventIds = new Set(existingEvents.map((e) => e.id));
  const newEventIds = new Set(events.map((e) => e.id));

  // Delete events that no longer exist
  for (const existingEvent of existingEvents) {
    if (!newEventIds.has(existingEvent.id)) {
      await deleteEvent(db, existingEvent.id);
    }
  }

  // Insert or update events
  for (const event of events) {
    if (existingEventIds.has(event.id)) {
      await updateEvent(db, event.id, { name: event.name, date: event.date });
    } else {
      await db.insert(schema.scheduleEvent).values({
        id: event.id,
        name: event.name,
        date: event.date,
        seasonId,
      });
    }
  }

  // Update matchup scheduling info
  for (const matchup of matchups) {
    await db
      .update(schema.matchup)
      .set({
        eventId: matchup.eventId,
        courtId: matchup.courtId,
        slotIndex: matchup.slotIndex,
      })
      .where(eq(schema.matchup.id, matchup.id));
  }
}

// ============== Public Schedule ==============

export type PublicMatchup = {
  id: string;
  teamA: { name: string; logoUrl: string };
  teamB: { name: string; logoUrl: string };
  category: string;
  courtId: string | null;
  slotIndex: number | null;
};

export type PublicScheduleEvent = {
  id: string;
  name: string;
  date: string;
  matchups: PublicMatchup[];
};

/**
 * Get public schedule for a season - upcoming events with their matchups
 */
export async function getPublicSchedule(
  db: Database,
  seasonId: string,
  options?: { upcomingOnly?: boolean; limit?: number },
) {
  const { upcomingOnly = false, limit } = options ?? {};

  // Build the query conditions
  const conditions = [eq(schema.scheduleEvent.seasonId, seasonId)];

  if (upcomingOnly) {
    const today = new Date().toISOString().split("T")[0];
    conditions.push(gte(schema.scheduleEvent.date, today));
  }

  // Get events
  const eventsQuery = db
    .select({
      id: schema.scheduleEvent.id,
      name: schema.scheduleEvent.name,
      date: schema.scheduleEvent.date,
    })
    .from(schema.scheduleEvent)
    .where(and(...conditions))
    .orderBy(asc(schema.scheduleEvent.date));

  const events = limit
    ? await eventsQuery.limit(limit)
    : await eventsQuery;

  if (events.length === 0) return [];

  // Get all matchups for these events
  const eventIds = events.map((e) => e.id);
  const matchups = await getMatchupsBySeasonId(db, seasonId);

  // Filter to only scheduled matchups for these events
  const scheduledMatchups = matchups.filter(
    (m) => m.eventId && eventIds.includes(m.eventId),
  );

  // Group matchups by event
  const matchupsByEvent = new Map<string, typeof scheduledMatchups>();
  for (const matchup of scheduledMatchups) {
    if (matchup.eventId) {
      const existing = matchupsByEvent.get(matchup.eventId) ?? [];
      existing.push(matchup);
      matchupsByEvent.set(matchup.eventId, existing);
    }
  }

  // Build the result with matchups grouped by event, sorted by slot
  return events.map((event) => {
    const eventMatchups = matchupsByEvent.get(event.id) ?? [];
    // Sort by slot index
    eventMatchups.sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));

    return {
      ...event,
      matchups: eventMatchups.map((m) => ({
        id: m.id,
        teamA: { name: m.teamA.name, logoUrl: m.teamA.logoUrl },
        teamB: { name: m.teamB.name, logoUrl: m.teamB.logoUrl },
        category: m.category,
        courtId: m.courtId,
        slotIndex: m.slotIndex,
      })),
    };
  });
}
