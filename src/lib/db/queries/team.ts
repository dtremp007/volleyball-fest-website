import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";

const teamColumns = {
  id: schema.team.id,
  name: schema.team.name,
  logoUrl: schema.team.logoUrl,
  category: schema.category.name,
  captainName: schema.team.captainName,
  captainPhone: schema.team.captainPhone,
  coCaptainName: schema.team.coCaptainName,
  coCaptainPhone: schema.team.coCaptainPhone,
  unavailableDates: schema.team.unavailableDates,
  comingFrom: schema.team.comingFrom,
  season: schema.season.name,
};

export const getTeams = async (db: Database) => {
  return await db
    .select(teamColumns)
    .from(schema.team)
    .innerJoin(schema.seasonTeam, eq(schema.team.id, schema.seasonTeam.teamId))
    .innerJoin(schema.season, eq(schema.seasonTeam.seasonId, schema.season.id))
    .innerJoin(schema.category, eq(schema.team.categoryId, schema.category.id));
};

export const getTeamById = async (db: Database, id: string) => {
  const [team] = await db
    .select(teamColumns)
    .from(schema.team)
    .where(eq(schema.team.id, id))
    .innerJoin(schema.seasonTeam, eq(schema.team.id, schema.seasonTeam.teamId))
    .innerJoin(schema.season, eq(schema.seasonTeam.seasonId, schema.season.id))
    .innerJoin(schema.category, eq(schema.team.categoryId, schema.category.id));

  if (!team) {
    return null;
  }

  const players = await db
    .select({
      id: schema.player.id,
      name: schema.player.name,
      jerseyNumber: schema.player.jerseyNumber,
      position: schema.position.name,
    })
    .from(schema.player)
    .where(eq(schema.player.teamId, id))
    .leftJoin(schema.position, eq(schema.player.positionId, schema.position.id));

  return { ...team, players };
};

export const getTeamsBySeasonId = async (
  db: Database,
  seasonId: string,
  categoryId?: string,
) => {
  const conditions = [eq(schema.seasonTeam.seasonId, seasonId)];

  if (categoryId) {
    conditions.push(eq(schema.team.categoryId, categoryId));
  }

  return await db
    .select(teamColumns)
    .from(schema.team)
    .innerJoin(schema.seasonTeam, eq(schema.team.id, schema.seasonTeam.teamId))
    .innerJoin(schema.season, eq(schema.seasonTeam.seasonId, schema.season.id))
    .innerJoin(schema.category, eq(schema.team.categoryId, schema.category.id))
    .where(and(...conditions));
};

type CreateTeamParams = {
  name: string;
  logoUrl: string;
  categoryId: string;
  captainName: string;
  captainPhone: string;
  coCaptainName: string;
  coCaptainPhone: string;
  unavailableDates: string;
  comingFrom: string;
  seasonId: string;
  players: {
    name: string;
    jerseyNumber: string;
    positionId: string;
  }[];
};

export const createTeam = async (db: Database, params: CreateTeamParams) => {
  const { players, ...teamParams } = params;
  const teamId = uuidv4();
  const [team] = await Promise.all([
    await db
      .insert(schema.team)
      .values({
        id: teamId,
        ...teamParams,
      })
      .returning(),

    // Add the team to the season
    await db
      .insert(schema.seasonTeam)
      .values({
        seasonId: params.seasonId,
        teamId,
      })
      .onConflictDoNothing(),

    // Add the players to the team
    await db.insert(schema.player).values(
      players.map((player) => ({
        id: uuidv4(),
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        positionId: player.positionId,
        teamId,
      })),
    ),
  ]);

  return team;
};

export const copyTeamsToSeason = async (
  db: Database,
  teamIds: string[],
  targetSeasonId: string,
) => {
  if (teamIds.length === 0) return { count: 0 };

  await db
    .insert(schema.seasonTeam)
    .values(
      teamIds.map((teamId) => ({
        seasonId: targetSeasonId,
        teamId,
      })),
    )
    .onConflictDoNothing();

  return { count: teamIds.length };
};
