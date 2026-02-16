import { and, asc, eq, gte, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";

// ============== Schedule Config ==============

export async function getScheduleConfig(db: Database, seasonId: string) {
  const [config] = await db
    .select({
      id: schema.scheduleConfig.id,
      seasonId: schema.scheduleConfig.seasonId,
      defaultStartTime: schema.scheduleConfig.defaultStartTime,
      gamesPerEvening: schema.scheduleConfig.gamesPerEvening,
    })
    .from(schema.scheduleConfig)
    .where(eq(schema.scheduleConfig.seasonId, seasonId))
    .limit(1);

  return config ?? null;
}

export async function upsertScheduleConfig(
  db: Database,
  params: {
    seasonId: string;
    defaultStartTime: string;
    gamesPerEvening: number;
  },
) {
  const existing = await getScheduleConfig(db, params.seasonId);

  if (existing) {
    await db
      .update(schema.scheduleConfig)
      .set({
        defaultStartTime: params.defaultStartTime,
        gamesPerEvening: params.gamesPerEvening,
      })
      .where(eq(schema.scheduleConfig.id, existing.id));
    return { id: existing.id, ...params };
  } else {
    const id = uuidv4();
    await db.insert(schema.scheduleConfig).values({ id, ...params });
    return { id, ...params };
  }
}

// ============== Events ==============

export async function getEventsBySeasonId(db: Database, seasonId: string) {
  return await db
    .select({
      id: schema.scheduleEvent.id,
      name: schema.scheduleEvent.name,
      date: schema.scheduleEvent.startTime,
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
  await db.insert(schema.scheduleEvent).values({
    id,
    name: params.name,
    startTime: params.date,
    seasonId: params.seasonId,
  });
  return { id, ...params };
}

export async function updateEvent(
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
    .update(schema.scheduleEvent)
    .set(updateData)
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
  // Get all teams for this season with their group assignments
  const teams = await db
    .select({
      id: schema.team.id,
      name: schema.team.name,
      logoUrl: schema.team.logoUrl,
      categoryId: schema.team.categoryId,
      category: schema.category.name,
      groupId: schema.seasonTeam.groupId,
    })
    .from(schema.team)
    .innerJoin(schema.seasonTeam, eq(schema.team.id, schema.seasonTeam.teamId))
    .innerJoin(schema.category, eq(schema.team.categoryId, schema.category.id))
    .where(eq(schema.seasonTeam.seasonId, seasonId));

  // Group teams by category and then by group
  // Teams without a group are grouped together per category
  const teamsByCategoryAndGroup = teams.reduce(
    (acc, team) => {
      if (!acc[team.category]) {
        acc[team.category] = {};
      }
      const groupKey = team.groupId ?? "__ungrouped__";
      if (!acc[team.category][groupKey]) {
        acc[team.category][groupKey] = [];
      }
      acc[team.category][groupKey].push(team);
      return acc;
    },
    {} as Record<string, Record<string, typeof teams>>,
  );

  // Generate round-robin matchups for each category-group combination
  const matchupsToInsert: {
    id: string;
    teamAId: string;
    teamBId: string;
    seasonId: string;
  }[] = [];

  for (const categoryGroups of Object.values(teamsByCategoryAndGroup)) {
    for (const groupTeams of Object.values(categoryGroups)) {
      // Only generate matchups if there are at least 2 teams in the group
      if (groupTeams.length < 2) continue;

      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          matchupsToInsert.push({
            id: uuidv4(),
            teamAId: groupTeams[i].id,
            teamBId: groupTeams[j].id,
            seasonId,
          });
        }
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

/**
 * Auto-schedule matchups across events and courts
 * Distributes matchups evenly across events, alternating between courts A and B
 */
export async function autoScheduleMatchups(
  db: Database,
  seasonId: string,
  eventIds: string[],
  gamesPerEvening: number,
) {
  // Get all unscheduled matchups
  const unscheduledMatchups = await db
    .select({
      id: schema.matchup.id,
    })
    .from(schema.matchup)
    .where(
      and(
        eq(schema.matchup.seasonId, seasonId),
        isNull(schema.matchup.eventId),
      ),
    );

  if (unscheduledMatchups.length === 0 || eventIds.length === 0) {
    return;
  }

  const courts: ("A" | "B")[] = ["A", "B"];
  const totalSlotsPerEvent = gamesPerEvening * courts.length; // 2 courts per event
  const totalCapacity = eventIds.length * totalSlotsPerEvent;

  if (unscheduledMatchups.length > totalCapacity) {
    throw new Error(
      `Cannot schedule ${unscheduledMatchups.length} matchups: only ${totalCapacity} slots available`,
    );
  }

  // Distribute matchups across events and courts
  const updates: Array<{
    id: string;
    eventId: string;
    courtId: "A" | "B";
    slotIndex: number;
  }> = [];

  let matchupIndex = 0;
  for (const eventId of eventIds) {
    for (let slotIndex = 0; slotIndex < gamesPerEvening; slotIndex++) {
      for (const courtId of courts) {
        if (matchupIndex >= unscheduledMatchups.length) break;
        updates.push({
          id: unscheduledMatchups[matchupIndex].id,
          eventId,
          courtId,
          slotIndex,
        });
        matchupIndex++;
      }
      if (matchupIndex >= unscheduledMatchups.length) break;
    }
    if (matchupIndex >= unscheduledMatchups.length) break;
  }

  // Batch update matchups
  for (const update of updates) {
    await db
      .update(schema.matchup)
      .set({
        eventId: update.eventId,
        courtId: update.courtId,
        slotIndex: update.slotIndex,
      })
      .where(eq(schema.matchup.id, update.id));
  }
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
        startTime: event.date,
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

// ============== Configure Groups & Generate Matchups ==============

type GroupConfig = {
  categoryId: string;
  groups: Array<{
    name: string;
    teamIds: string[];
  }>;
};

/**
 * One-shot function to configure groups and generate matchups
 * 1. Deletes existing groups and matchups for the season
 * 2. Creates new groups with team assignments
 * 3. Generates round-robin matchups per group
 */
export async function configureGroupsAndGenerateMatchups(
  db: Database,
  seasonId: string,
  categoryConfigs: GroupConfig[],
) {
  // Delete existing matchups for this season
  await db.delete(schema.matchup).where(eq(schema.matchup.seasonId, seasonId));

  // Delete existing groups for this season
  await db.delete(schema.group).where(eq(schema.group.seasonId, seasonId));

  // Clear all team group assignments for this season
  await db
    .update(schema.seasonTeam)
    .set({ groupId: null })
    .where(eq(schema.seasonTeam.seasonId, seasonId));

  // Create groups and assign teams
  const matchupsToInsert: Array<{
    id: string;
    teamAId: string;
    teamBId: string;
    seasonId: string;
  }> = [];

  for (const categoryConfig of categoryConfigs) {
    for (const groupConfig of categoryConfig.groups) {
      // Create the group
      const groupId = uuidv4();
      await db.insert(schema.group).values({
        id: groupId,
        name: groupConfig.name,
        seasonId,
        categoryId: categoryConfig.categoryId,
      });

      // Assign teams to this group
      for (const teamId of groupConfig.teamIds) {
        await db
          .update(schema.seasonTeam)
          .set({ groupId })
          .where(
            and(
              eq(schema.seasonTeam.seasonId, seasonId),
              eq(schema.seasonTeam.teamId, teamId),
            ),
          );
      }

      // Generate round-robin matchups for this group
      const teamIds = groupConfig.teamIds;
      if (teamIds.length >= 2) {
        for (let i = 0; i < teamIds.length; i++) {
          for (let j = i + 1; j < teamIds.length; j++) {
            matchupsToInsert.push({
              id: uuidv4(),
              teamAId: teamIds[i],
              teamBId: teamIds[j],
              seasonId,
            });
          }
        }
      }
    }
  }

  // Bulk insert matchups
  if (matchupsToInsert.length > 0) {
    await db.insert(schema.matchup).values(matchupsToInsert);
  }

  return { matchupsGenerated: matchupsToInsert.length };
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

export type EventWithMatchups = {
  id: string;
  name: string;
  date: string;
  season: {
    id: string;
    name: string;
  };
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
    conditions.push(gte(schema.scheduleEvent.startTime, today));
  }

  // Get events
  const eventsQuery = db
    .select({
      id: schema.scheduleEvent.id,
      name: schema.scheduleEvent.name,
      date: schema.scheduleEvent.startTime,
    })
    .from(schema.scheduleEvent)
    .where(and(...conditions))
    .orderBy(asc(schema.scheduleEvent.startTime));

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

/**
 * Get a single event with all scheduled matchups for PDF/details views.
 */
export async function getEventWithMatchupsById(db: Database, eventId: string) {
  const [event] = await db
    .select({
      id: schema.scheduleEvent.id,
      name: schema.scheduleEvent.name,
      date: schema.scheduleEvent.startTime,
      seasonId: schema.scheduleEvent.seasonId,
      seasonName: schema.season.name,
    })
    .from(schema.scheduleEvent)
    .innerJoin(schema.season, eq(schema.scheduleEvent.seasonId, schema.season.id))
    .where(eq(schema.scheduleEvent.id, eventId))
    .limit(1);

  if (!event) {
    return null;
  }

  const seasonMatchups = await getMatchupsBySeasonId(db, event.seasonId);
  const eventMatchups = seasonMatchups
    .filter((matchup) => matchup.eventId === eventId)
    .sort((a, b) => {
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
    matchups: eventMatchups.map((matchup) => ({
      id: matchup.id,
      teamA: { name: matchup.teamA.name, logoUrl: matchup.teamA.logoUrl },
      teamB: { name: matchup.teamB.name, logoUrl: matchup.teamB.logoUrl },
      category: matchup.category,
      courtId: matchup.courtId,
      slotIndex: matchup.slotIndex,
    })),
  } satisfies EventWithMatchups;
}
