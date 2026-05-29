import { and, asc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Database } from "~/lib/db";
import { getCategoryById } from "~/lib/db/queries/category";
import { getStandingsBySeasonId, type TeamStanding } from "~/lib/db/queries/schedule";
import * as schema from "~/lib/db/schema";

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
};

type PlayoffTemplate = {
  matchups: GeneratedMatchup[];
  teams: GeneratedMatchupTeam[];
};

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
  params: { seasonId: string; categoryId: string },
) {
  if (await hasPlayoffGraph(db, params)) {
    throw new Error("Playoff graph already exists for this category");
  }

  const generated = await buildPlayoffGraphFromStandings(db, params);

  await db.insert(schema.playoffMatchup).values(generated.matchups);
  await db.insert(schema.playoffMatchupTeam).values(generated.teams);

  return {
    matchupsGenerated: generated.matchups.length,
    slotsGenerated: generated.teams.length,
  };
}

async function buildPlayoffGraphFromStandings(
  db: Database,
  params: { seasonId: string; categoryId: string },
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
  if (seedCount >= 5) {
    return buildTopFiveTemplate(params, groupA, groupB);
  }
  if (seedCount >= 4) {
    return buildTopFourTemplate(params, groupA, groupB);
  }

  throw new Error("Playoff generation requires at least four teams per group");
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
  const sf1 = matchup(params, "SF 1", "semifinal");
  const sf2 = matchup(params, "SF 2", "semifinal");
  const final = matchup(params, "Final", "final");

  return {
    matchups: [qf1, qf2, qf3, qf4, sf1, sf2, final],
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
      dependencySlot(final.id, 0, "Winner SF 1", sf1.id),
      dependencySlot(final.id, 1, "Winner SF 2", sf2.id),
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
  const m1 = matchup(params, "M1", "play-in", 1);
  const m2 = matchup(params, "M2", "play-in", 1);
  const qf1 = matchup(params, "QF 1", "quarter-final");
  const qf2 = matchup(params, "QF 2", "quarter-final");
  const qf3 = matchup(params, "QF 3", "quarter-final");
  const qf4 = matchup(params, "QF 4", "quarter-final");
  const sf1 = matchup(params, "SF 1", "semifinal");
  const sf2 = matchup(params, "SF 2", "semifinal");
  const final = matchup(params, "Final", "final");

  return {
    matchups: [m1, m2, qf1, qf2, qf3, qf4, sf1, sf2, final],
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
      dependencySlot(final.id, 0, "Winner SF 1", sf1.id),
      dependencySlot(final.id, 1, "Winner SF 2", sf2.id),
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
    duration: 45,
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
  };
}

function dependencySlot(
  matchupId: string,
  slotIndex: number,
  label: string,
  dependsOn: string,
): GeneratedMatchupTeam {
  return {
    id: uuidv4(),
    matchupId,
    slotIndex,
    teamId: null,
    label,
    dependsOn,
  };
}
