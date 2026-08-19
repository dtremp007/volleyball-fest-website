import { format } from "date-fns";
import { and, eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { missingRoundRobinPairs } from "~/lib/assistant/pairing";
import type { Database } from "~/lib/db";
import {
  autoScheduleMatchups,
  getEventsBySeasonId,
  getMatchupsBySeasonId,
  getScheduleConfig,
  loadSolveScheduleContext,
} from "~/lib/db/queries/schedule";
import {
  getPlacementViolationReason,
  type ScheduledMatchupPlacement,
} from "~/lib/db/queries/schedule-algorithm";
import { resolveScheduleWeightsForSeason } from "~/lib/db/queries/schedule-preset";
import { getSeasonById } from "~/lib/db/queries/season";
import * as schema from "~/lib/db/schema";
import { unorderedTeamPairKey } from "~/lib/schedule/matchup-pair";
import { combineDateAndTime, getDatePart } from "~/lib/schedule/slot-times";
import { getScheduleTemplateForDate } from "~/lib/schedule/weekday-templates";
import type { SchedulingWeights } from "~/validators/scheduling.validators";

const COURTS = ["A", "B"] as const;

type SeasonMatchup = Awaited<ReturnType<typeof getMatchupsBySeasonId>>[number];

function toPlacement(matchup: SeasonMatchup): ScheduledMatchupPlacement | null {
  if (!matchup.eventId || !matchup.courtId || matchup.slotIndex == null) {
    return null;
  }
  if (matchup.courtId !== "A" && matchup.courtId !== "B") {
    return null;
  }
  return {
    id: matchup.id,
    teamAId: matchup.teamA.id,
    teamBId: matchup.teamB.id,
    eventId: matchup.eventId,
    courtId: matchup.courtId,
    slotIndex: matchup.slotIndex,
  };
}

function slotKey(eventId: string, courtId: string, slotIndex: number) {
  return `${eventId}:${courtId}:${slotIndex}`;
}

async function requireSeason(db: Database, seasonId: string) {
  const season = await getSeasonById(db, seasonId);
  if (!season) {
    throw new Error("Season not found");
  }
  return season;
}

export async function getAssistantSeasonOverview(db: Database, seasonId: string) {
  const season = await requireSeason(db, seasonId);
  const [teams, matchups, events, config, weights] = await Promise.all([
    db
      .select({
        id: schema.seasonTeam.teamId,
        name: schema.seasonTeam.name,
        categoryId: schema.seasonTeam.categoryId,
        category: schema.category.name,
        groupId: schema.seasonTeam.groupId,
        groupName: schema.group.name,
        meetingsPerPair: schema.category.meetingsPerPair,
      })
      .from(schema.seasonTeam)
      .innerJoin(schema.category, eq(schema.seasonTeam.categoryId, schema.category.id))
      .leftJoin(schema.group, eq(schema.seasonTeam.groupId, schema.group.id))
      .where(eq(schema.seasonTeam.seasonId, seasonId)),
    getMatchupsBySeasonId(db, seasonId),
    getEventsBySeasonId(db, seasonId),
    getScheduleConfig(db, seasonId),
    resolveScheduleWeightsForSeason(db, seasonId),
  ]);

  const teamById = new Map(teams.map((team) => [team.id, team]));
  const groups = new Map<
    string,
    {
      id: string | null;
      name: string;
      category: string;
      categoryId: string | null;
      meetingsPerPair: number;
      teamIds: string[];
    }
  >();

  for (const team of teams) {
    const key = `${team.categoryId ?? "none"}:${team.groupId ?? "__ungrouped__"}`;
    const existing = groups.get(key);
    if (existing) {
      existing.teamIds.push(team.id);
      continue;
    }
    groups.set(key, {
      id: team.groupId,
      name: team.groupName ?? "Ungrouped",
      category: team.category,
      categoryId: team.categoryId,
      meetingsPerPair: team.meetingsPerPair,
      teamIds: [team.id],
    });
  }

  const pairingGaps: Array<{
    group: string;
    category: string;
    teamA: string;
    teamB: string;
    teamAId: string;
    teamBId: string;
    meetings: number;
    target: number;
  }> = [];
  const extraMeetings: Array<{
    teamA: string;
    teamB: string;
    teamAId: string;
    teamBId: string;
    meetings: number;
    target: number;
  }> = [];

  for (const group of groups.values()) {
    const groupMatchups = matchups.filter(
      (matchup) =>
        group.teamIds.includes(matchup.teamA.id) &&
        group.teamIds.includes(matchup.teamB.id),
    );
    const counts = new Map<string, number>();
    for (const matchup of groupMatchups) {
      const key = unorderedTeamPairKey(matchup.teamA.id, matchup.teamB.id);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    for (const missing of missingRoundRobinPairs(
      group.teamIds,
      groupMatchups.map((matchup) => ({
        teamAId: matchup.teamA.id,
        teamBId: matchup.teamB.id,
      })),
      group.meetingsPerPair,
    )) {
      const teamA = teamById.get(missing.teamAId);
      const teamB = teamById.get(missing.teamBId);
      if (!teamA || !teamB) continue;
      pairingGaps.push({
        group: group.name,
        category: group.category,
        teamA: teamA.name,
        teamB: teamB.name,
        teamAId: teamA.id,
        teamBId: teamB.id,
        meetings: counts.get(unorderedTeamPairKey(teamA.id, teamB.id)) ?? 0,
        target: group.meetingsPerPair,
      });
    }

    for (const [key, meetings] of counts) {
      if (meetings <= group.meetingsPerPair) continue;
      const [teamAId, teamBId] = key.split(":");
      if (!teamAId || !teamBId) continue;
      const teamA = teamById.get(teamAId);
      const teamB = teamById.get(teamBId);
      if (!teamA || !teamB) continue;
      extraMeetings.push({
        teamA: teamA.name,
        teamB: teamB.name,
        teamAId: teamA.id,
        teamBId: teamB.id,
        meetings,
        target: group.meetingsPerPair,
      });
    }
  }

  const matchupsByEventId = new Map<string, SeasonMatchup[]>();
  for (const matchup of matchups) {
    if (!matchup.eventId) continue;
    const existing = matchupsByEventId.get(matchup.eventId) ?? [];
    existing.push(matchup);
    matchupsByEventId.set(matchup.eventId, existing);
  }

  return {
    season: {
      id: season.id,
      name: season.name,
      state: season.state,
      startDate: season.startDate,
      endDate: season.endDate,
    },
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      category: team.category,
      categoryId: team.categoryId,
      group: team.groupName,
      groupId: team.groupId,
    })),
    groups: Array.from(groups.values()).map((group) => ({
      id: group.id,
      name: group.name,
      category: group.category,
      categoryId: group.categoryId,
      meetingsPerPair: group.meetingsPerPair,
      teamCount: group.teamIds.length,
      teamIds: group.teamIds,
    })),
    matchupCounts: {
      total: matchups.length,
      scheduled: matchups.filter((matchup) => matchup.eventId).length,
      unscheduled: matchups.filter((matchup) => !matchup.eventId).length,
      scored: matchups.filter((matchup) => matchup.hasScores).length,
    },
    pairingGaps,
    extraMeetings,
    events: events
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((event) => {
        const eventMatchups = matchupsByEventId.get(event.id) ?? [];
        return {
          id: event.id,
          name: event.name,
          date: getDatePart(event.date) || event.date,
          matchupCount: eventMatchups.length,
          scoredCount: eventMatchups.filter((matchup) => matchup.hasScores).length,
        };
      }),
    config: {
      defaultStartTime: config?.defaultStartTime ?? null,
      gamesPerEvening: config?.gamesPerEvening ?? null,
    },
    weights,
  };
}

export async function getAssistantScheduleDay(
  db: Database,
  seasonId: string,
  eventId: string,
) {
  await requireSeason(db, seasonId);
  const events = await getEventsBySeasonId(db, seasonId);
  const event = events.find((row) => row.id === eventId);
  if (!event) {
    throw new Error("Event not found in this season");
  }

  const matchups = await getMatchupsBySeasonId(db, seasonId);
  const onDay = matchups
    .filter((matchup) => matchup.eventId === eventId)
    .slice()
    .sort((a, b) => {
      const slotDelta = (a.slotIndex ?? 0) - (b.slotIndex ?? 0);
      if (slotDelta !== 0) return slotDelta;
      return (a.courtId ?? "").localeCompare(b.courtId ?? "");
    });

  return {
    event: {
      id: event.id,
      name: event.name,
      date: getDatePart(event.date) || event.date,
    },
    matchups: onDay.map((matchup) => ({
      id: matchup.id,
      teamA: matchup.teamA.name,
      teamB: matchup.teamB.name,
      teamAId: matchup.teamA.id,
      teamBId: matchup.teamB.id,
      category: matchup.category,
      courtId: matchup.courtId,
      slotIndex: matchup.slotIndex,
      hasScores: matchup.hasScores,
    })),
    unscheduled: matchups
      .filter((matchup) => !matchup.eventId)
      .map((matchup) => ({
        id: matchup.id,
        teamA: matchup.teamA.name,
        teamB: matchup.teamB.name,
        category: matchup.category,
      })),
  };
}

export async function createAssistantMatchups(
  db: Database,
  seasonId: string,
  pairs: Array<{ teamAId: string; teamBId: string; count: number }>,
) {
  await requireSeason(db, seasonId);
  const teams = await db
    .select({
      id: schema.seasonTeam.teamId,
      name: schema.seasonTeam.name,
      categoryId: schema.seasonTeam.categoryId,
      category: schema.category.name,
      groupId: schema.seasonTeam.groupId,
      groupName: schema.group.name,
    })
    .from(schema.seasonTeam)
    .innerJoin(schema.category, eq(schema.seasonTeam.categoryId, schema.category.id))
    .leftJoin(schema.group, eq(schema.seasonTeam.groupId, schema.group.id))
    .where(eq(schema.seasonTeam.seasonId, seasonId));
  const teamById = new Map(teams.map((team) => [team.id, team]));

  const created: Array<{
    id: string;
    teamA: string;
    teamB: string;
    warning?: string;
  }> = [];
  const errors: string[] = [];
  const rows: Array<{
    id: string;
    teamAId: string;
    teamBId: string;
    seasonId: string;
  }> = [];

  for (const pair of pairs) {
    if (pair.teamAId === pair.teamBId) {
      errors.push("A team cannot play itself.");
      continue;
    }
    const teamA = teamById.get(pair.teamAId);
    const teamB = teamById.get(pair.teamBId);
    if (!teamA || !teamB) {
      errors.push("Both teams must belong to this season.");
      continue;
    }
    if (teamA.categoryId !== teamB.categoryId) {
      errors.push(`${teamA.name} and ${teamB.name} are in different categories.`);
      continue;
    }

    let warning: string | undefined;
    if (teamA.groupId !== teamB.groupId) {
      warning = `${teamA.name} and ${teamB.name} are not in the same group.`;
    }

    for (let index = 0; index < pair.count; index++) {
      const id = uuidv4();
      rows.push({
        id,
        teamAId: pair.teamAId,
        teamBId: pair.teamBId,
        seasonId,
      });
      created.push({
        id,
        teamA: teamA.name,
        teamB: teamB.name,
        warning,
      });
    }
  }

  if (rows.length > 0) {
    await db.insert(schema.matchup).values(rows);
  }

  return {
    createdCount: created.length,
    created,
    errors,
  };
}

export async function fillMissingRoundRobinMatchups(
  db: Database,
  seasonId: string,
  options?: { meetingsPerPair?: number; groupId?: string },
) {
  await requireSeason(db, seasonId);
  const teams = await db
    .select({
      id: schema.seasonTeam.teamId,
      name: schema.seasonTeam.name,
      categoryId: schema.seasonTeam.categoryId,
      groupId: schema.seasonTeam.groupId,
      meetingsPerPair: schema.category.meetingsPerPair,
    })
    .from(schema.seasonTeam)
    .innerJoin(schema.category, eq(schema.seasonTeam.categoryId, schema.category.id))
    .where(eq(schema.seasonTeam.seasonId, seasonId));

  const filtered = options?.groupId
    ? teams.filter((team) => team.groupId === options.groupId)
    : teams;
  if (options?.groupId && filtered.length === 0) {
    throw new Error("No teams found for that group");
  }

  const matchups = await getMatchupsBySeasonId(db, seasonId);
  const existingPairs = matchups.map((matchup) => ({
    teamAId: matchup.teamA.id,
    teamBId: matchup.teamB.id,
  }));

  const teamsByBucket = filtered.reduce((acc, team) => {
    const key = `${team.categoryId ?? "none"}:${team.groupId ?? "__ungrouped__"}`;
    const bucket = acc.get(key) ?? [];
    bucket.push(team);
    acc.set(key, bucket);
    return acc;
  }, new Map<string, typeof filtered>());

  const rows: Array<{
    id: string;
    teamAId: string;
    teamBId: string;
    seasonId: string;
  }> = [];

  for (const bucket of teamsByBucket.values()) {
    if (bucket.length < 2) continue;
    const target = options?.meetingsPerPair ?? bucket[0]?.meetingsPerPair ?? 1;
    for (const pair of missingRoundRobinPairs(
      bucket.map((team) => team.id),
      existingPairs,
      target,
    )) {
      const id = uuidv4();
      rows.push({
        id,
        teamAId: pair.teamAId,
        teamBId: pair.teamBId,
        seasonId,
      });
      existingPairs.push(pair);
    }
  }

  if (rows.length > 0) {
    await db.insert(schema.matchup).values(rows);
  }

  return { createdCount: rows.length };
}

export async function deleteUnscheduledAssistantMatchups(
  db: Database,
  seasonId: string,
  matchupIds: string[],
) {
  await requireSeason(db, seasonId);
  const matchups = await getMatchupsBySeasonId(db, seasonId);
  const allowed = new Set(
    matchups
      .filter(
        (matchup) =>
          matchupIds.includes(matchup.id) && !matchup.eventId && !matchup.hasScores,
      )
      .map((matchup) => matchup.id),
  );
  const skipped = matchupIds.filter((id) => !allowed.has(id));

  if (allowed.size > 0) {
    await db
      .delete(schema.matchup)
      .where(
        and(
          eq(schema.matchup.seasonId, seasonId),
          inArray(schema.matchup.id, Array.from(allowed)),
        ),
      );
  }

  return {
    deletedCount: allowed.size,
    skippedIds: skipped,
  };
}

async function createMissingEventsFromDates(
  db: Database,
  seasonId: string,
  dates: string[],
) {
  const events = await getEventsBySeasonId(db, seasonId);
  const existingDates = new Set(
    events.map((event) => getDatePart(event.date) || event.date),
  );
  const created: Array<{ id: string; date: string; name: string }> = [];

  for (const date of [...new Set(dates)]) {
    if (existingDates.has(date)) continue;
    const template = getScheduleTemplateForDate(date);
    const id = uuidv4();
    const name = format(new Date(`${date}T12:00:00`), "MMM d, yyyy");
    await db.insert(schema.scheduleEvent).values({
      id,
      name,
      startTime: combineDateAndTime(date, template.startTime),
      seasonId,
    });
    created.push({ id, date, name });
  }

  return created;
}

export async function fillUnscheduledMatchups(
  db: Database,
  seasonId: string,
  weights?: Partial<SchedulingWeights>,
) {
  const events = await getEventsBySeasonId(db, seasonId);
  if (events.length === 0) {
    throw new Error("No events exist. Pass dates to create game nights first.");
  }

  const resolvedWeights = await resolveScheduleWeightsForSeason(db, seasonId, {
    weights,
  });
  const input = await loadSolveScheduleContext(
    db,
    seasonId,
    events.map((event) => event.id),
    resolvedWeights,
  );
  if (!input) {
    return { scheduledCount: 0, unscheduledCount: 0 };
  }

  const matchups = await getMatchupsBySeasonId(db, seasonId);
  const existingPlacements = matchups
    .map(toPlacement)
    .filter((placement): placement is ScheduledMatchupPlacement => placement !== null);
  const occupied = new Set(
    existingPlacements.map((placement) =>
      slotKey(placement.eventId, placement.courtId, placement.slotIndex),
    ),
  );

  const emptySlots: Array<{
    eventId: string;
    courtId: (typeof COURTS)[number];
    slotIndex: number;
  }> = [];
  for (const eventId of input.orderedEventIds) {
    const slotCount = input.gamesPerEveningByEventId?.[eventId] ?? input.gamesPerEvening;
    for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
      for (const courtId of COURTS) {
        if (occupied.has(slotKey(eventId, courtId, slotIndex))) continue;
        emptySlots.push({ eventId, courtId, slotIndex });
      }
    }
  }

  const current = [...existingPlacements];
  const placed: ScheduledMatchupPlacement[] = [];
  const unscheduled = matchups.filter((matchup) => !matchup.eventId);

  for (const matchup of unscheduled) {
    for (const slot of emptySlots) {
      const key = slotKey(slot.eventId, slot.courtId, slot.slotIndex);
      if (occupied.has(key)) continue;
      const candidate: ScheduledMatchupPlacement = {
        id: matchup.id,
        teamAId: matchup.teamA.id,
        teamBId: matchup.teamB.id,
        eventId: slot.eventId,
        courtId: slot.courtId,
        slotIndex: slot.slotIndex,
      };
      if (getPlacementViolationReason(candidate, current, input.validationContext)) {
        continue;
      }
      current.push(candidate);
      placed.push(candidate);
      occupied.add(key);
      break;
    }
  }

  for (const placement of placed) {
    await db
      .update(schema.matchup)
      .set({
        eventId: placement.eventId,
        courtId: placement.courtId,
        slotIndex: placement.slotIndex,
      })
      .where(eq(schema.matchup.id, placement.id));
  }

  return {
    scheduledCount: placed.length,
    unscheduledCount: unscheduled.length - placed.length,
  };
}

export async function generateAssistantSchedule(
  db: Database,
  seasonId: string,
  options: {
    dates?: string[];
    mode: "fill" | "replace";
    weights?: Partial<SchedulingWeights>;
  },
) {
  await requireSeason(db, seasonId);
  const createdEvents = options.dates?.length
    ? await createMissingEventsFromDates(db, seasonId, options.dates)
    : [];

  const events = await getEventsBySeasonId(db, seasonId);
  if (events.length === 0) {
    throw new Error("No events exist. Pass dates like 2026-03-14 to create game nights.");
  }

  const matchups = await getMatchupsBySeasonId(db, seasonId);
  if (matchups.length === 0) {
    throw new Error("No matchups exist yet. Create or generate matchups first.");
  }

  const scoredCount = matchups.filter((matchup) => matchup.hasScores).length;
  if (options.mode === "replace" && scoredCount > 0) {
    throw new Error(
      "Cannot replace the schedule because some matchups already have scores. Use fill mode or place individual matchups.",
    );
  }

  if (options.mode === "replace") {
    const weights = await resolveScheduleWeightsForSeason(db, seasonId, {
      weights: options.weights,
    });
    const result = await autoScheduleMatchups(
      db,
      seasonId,
      events.map((event) => event.id),
      weights,
    );
    return {
      mode: options.mode,
      createdEvents,
      ...result,
    };
  }

  const result = await fillUnscheduledMatchups(db, seasonId, options.weights);
  return {
    mode: options.mode,
    createdEvents,
    ...result,
  };
}

export async function placeAssistantMatchup(
  db: Database,
  seasonId: string,
  input: {
    matchupId: string;
    eventId: string | null;
    courtId?: "A" | "B";
    slotIndex?: number;
  },
) {
  await requireSeason(db, seasonId);
  const matchups = await getMatchupsBySeasonId(db, seasonId);
  const matchup = matchups.find((row) => row.id === input.matchupId);
  if (!matchup) {
    throw new Error("Matchup not found in this season");
  }
  if (matchup.hasScores) {
    throw new Error("Cannot move a matchup that already has scores");
  }

  if (input.eventId === null) {
    await db
      .update(schema.matchup)
      .set({ eventId: null, courtId: null, slotIndex: null })
      .where(eq(schema.matchup.id, matchup.id));
    return { id: matchup.id, eventId: null, courtId: null, slotIndex: null };
  }

  if (!input.courtId || input.slotIndex == null) {
    throw new Error("courtId and slotIndex are required when placing a matchup");
  }

  const events = await getEventsBySeasonId(db, seasonId);
  if (!events.some((event) => event.id === input.eventId)) {
    throw new Error("Event not found in this season");
  }

  const occupied = matchups.find(
    (row) =>
      row.id !== matchup.id &&
      row.eventId === input.eventId &&
      row.courtId === input.courtId &&
      row.slotIndex === input.slotIndex,
  );
  if (occupied) {
    throw new Error(
      `Court ${input.courtId} slot ${input.slotIndex} is already taken by ${occupied.teamA.name} vs ${occupied.teamB.name}`,
    );
  }

  const weights = await resolveScheduleWeightsForSeason(db, seasonId);
  const context = await loadSolveScheduleContext(
    db,
    seasonId,
    events.map((event) => event.id),
    weights,
  );
  if (context) {
    const others = matchups
      .filter((row) => row.id !== matchup.id)
      .map(toPlacement)
      .filter((placement): placement is ScheduledMatchupPlacement => placement !== null);
    const reason = getPlacementViolationReason(
      {
        id: matchup.id,
        teamAId: matchup.teamA.id,
        teamBId: matchup.teamB.id,
        eventId: input.eventId,
        courtId: input.courtId,
        slotIndex: input.slotIndex,
      },
      others,
      context.validationContext,
    );
    if (reason) {
      throw new Error(reason);
    }
  }

  await db
    .update(schema.matchup)
    .set({
      eventId: input.eventId,
      courtId: input.courtId,
      slotIndex: input.slotIndex,
    })
    .where(eq(schema.matchup.id, matchup.id));

  return {
    id: matchup.id,
    eventId: input.eventId,
    courtId: input.courtId,
    slotIndex: input.slotIndex,
    teamA: matchup.teamA.name,
    teamB: matchup.teamB.name,
  };
}

export async function reorderAssistantEvent(
  db: Database,
  seasonId: string,
  input: {
    eventId: string;
    placements: Array<{ matchupId: string; courtId: "A" | "B"; slotIndex: number }>;
  },
) {
  await requireSeason(db, seasonId);
  const events = await getEventsBySeasonId(db, seasonId);
  if (!events.some((event) => event.id === input.eventId)) {
    throw new Error("Event not found in this season");
  }

  const matchups = await getMatchupsBySeasonId(db, seasonId);
  const matchupById = new Map(matchups.map((matchup) => [matchup.id, matchup]));
  const nextById = new Map(
    matchups.map((matchup) => [
      matchup.id,
      {
        eventId: matchup.eventId,
        courtId: matchup.courtId,
        slotIndex: matchup.slotIndex,
      },
    ]),
  );

  for (const placement of input.placements) {
    const matchup = matchupById.get(placement.matchupId);
    if (!matchup) {
      throw new Error(`Matchup ${placement.matchupId} was not found in this season`);
    }
    if (
      matchup.hasScores &&
      (matchup.eventId !== input.eventId ||
        matchup.courtId !== placement.courtId ||
        matchup.slotIndex !== placement.slotIndex)
    ) {
      throw new Error(
        `Cannot move scored matchup ${matchup.teamA.name} vs ${matchup.teamB.name}`,
      );
    }
    nextById.set(matchup.id, {
      eventId: input.eventId,
      courtId: placement.courtId,
      slotIndex: placement.slotIndex,
    });
  }

  const nextPlacements: ScheduledMatchupPlacement[] = [];
  const occupied = new Set<string>();
  for (const matchup of matchups) {
    const next = nextById.get(matchup.id);
    if (!next?.eventId || !next.courtId || next.slotIndex == null) continue;
    if (next.courtId !== "A" && next.courtId !== "B") continue;
    const key = slotKey(next.eventId, next.courtId, next.slotIndex);
    if (occupied.has(key)) {
      throw new Error(
        `Two matchups were assigned to court ${next.courtId} slot ${next.slotIndex}`,
      );
    }
    occupied.add(key);
    nextPlacements.push({
      id: matchup.id,
      teamAId: matchup.teamA.id,
      teamBId: matchup.teamB.id,
      eventId: next.eventId,
      courtId: next.courtId,
      slotIndex: next.slotIndex,
    });
  }

  const weights = await resolveScheduleWeightsForSeason(db, seasonId);
  const context = await loadSolveScheduleContext(
    db,
    seasonId,
    events.map((event) => event.id),
    weights,
  );
  if (context) {
    for (const placement of nextPlacements) {
      const others = nextPlacements.filter((row) => row.id !== placement.id);
      const reason = getPlacementViolationReason(
        placement,
        others,
        context.validationContext,
      );
      if (reason) {
        const matchup = matchupById.get(placement.id);
        throw new Error(
          `${matchup?.teamA.name ?? "Team"} vs ${matchup?.teamB.name ?? "Team"}: ${reason}`,
        );
      }
    }
  }

  for (const placement of input.placements) {
    await db
      .update(schema.matchup)
      .set({
        eventId: input.eventId,
        courtId: placement.courtId,
        slotIndex: placement.slotIndex,
      })
      .where(eq(schema.matchup.id, placement.matchupId));
  }

  return { updatedCount: input.placements.length };
}
