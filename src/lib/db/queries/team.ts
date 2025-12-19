import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";

const teamColumns = {
  id: schema.team.id,
  name: schema.team.name,
  logoUrl: schema.team.logoUrl,
  captainName: schema.team.captainName,
  captainPhone: schema.team.captainPhone,
  coCaptainName: schema.team.coCaptainName,
  coCaptainPhone: schema.team.coCaptainPhone,
  unavailableDates: schema.team.unavailableDates,
  comingFrom: schema.team.comingFrom,
  season: {
    id: schema.season.id,
    name: schema.season.name,
  },
  notes: schema.team.notes,
  category: {
    id: schema.category.id,
    name: schema.category.name,
  }
};

const playerColumns = {
  id: schema.player.id,
  name: schema.player.name,
  jerseyNumber: schema.player.jerseyNumber,
  position: {
    id: schema.position.id,
    name: schema.position.name,
  }
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
    .select(playerColumns)
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

type UpsertTeamParams = {
  id?: string;
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

export const upsertTeam = async (db: Database, params: UpsertTeamParams) => {
  const { id, players, ...teamParams } = params;
  const teamId = id ?? uuidv4();
  const [team] = await Promise.all([
    await db
      .insert(schema.team)
      .values({
        id: teamId,
        ...teamParams,
      })
      .onConflictDoUpdate({
        target: [schema.team.id],
        set: teamParams,
      }),

    // Add the team to the season
    await db
      .insert(schema.seasonTeam)
      .values({
        seasonId: params.seasonId,
        teamId,
      })
      .onConflictDoNothing(),

    await db.transaction(async (tx) => {
      // delete all players
      await tx.delete(schema.player).where(eq(schema.player.teamId, teamId));

      // Add the players to the team
      await tx.insert(schema.player).values(
        players.map((player) => ({
          id: uuidv4(),
          name: player.name,
          jerseyNumber: player.jerseyNumber,
          positionId: player.positionId,
          teamId,
        })),
      );
    }),
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

// Public columns - excludes sensitive captain info
const publicTeamColumns = {
  id: schema.team.id,
  name: schema.team.name,
  logoUrl: schema.team.logoUrl,
  category: schema.category.name,
  categoryId: schema.team.categoryId,
};

export type PublicTeam = {
  id: string;
  name: string;
  logoUrl: string;
  category: string;
  categoryId: string | null;
  players: {
    id: string;
    name: string;
    jerseyNumber: string;
    position: string | null;
  }[];
};

/**
 * Get all teams with players for public display (no sensitive data)
 */
export const getPublicTeamsBySeasonId = async (
  db: Database,
  seasonId: string,
): Promise<PublicTeam[]> => {
  // Get all teams for the season
  const teams = await db
    .select(publicTeamColumns)
    .from(schema.team)
    .innerJoin(schema.seasonTeam, eq(schema.team.id, schema.seasonTeam.teamId))
    .innerJoin(schema.category, eq(schema.team.categoryId, schema.category.id))
    .where(eq(schema.seasonTeam.seasonId, seasonId));

  if (teams.length === 0) return [];

  // Get all players for these teams
  const teamIds = teams.map((t) => t.id);
  const players = await db
    .select({
      id: schema.player.id,
      name: schema.player.name,
      jerseyNumber: schema.player.jerseyNumber,
      position: schema.position.name,
      teamId: schema.player.teamId,
    })
    .from(schema.player)
    .leftJoin(schema.position, eq(schema.player.positionId, schema.position.id));

  // Group players by team
  const playersByTeam = new Map<string, typeof players>();
  for (const player of players) {
    if (player.teamId && teamIds.includes(player.teamId)) {
      const existing = playersByTeam.get(player.teamId) ?? [];
      existing.push(player);
      playersByTeam.set(player.teamId, existing);
    }
  }

  return teams.map((team) => ({
    ...team,
    players: (playersByTeam.get(team.id) ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      jerseyNumber: p.jerseyNumber,
      position: p.position,
    })),
  }));
};
