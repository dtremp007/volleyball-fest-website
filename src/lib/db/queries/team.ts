import { and, eq, inArray } from "drizzle-orm";
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
  isFarAway: schema.team.isFarAway,
  season: {
    id: schema.season.id,
    name: schema.season.name,
  },
  notes: schema.team.notes,
  category: {
    id: schema.category.id,
    name: schema.category.name,
  },
};

const playerColumns = {
  id: schema.player.id,
  name: schema.player.name,
  jerseyNumber: schema.player.jerseyNumber,
  position: {
    id: schema.position.id,
    name: schema.position.name,
  },
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
    .select({
      ...teamColumns,
      groupId: schema.seasonTeam.groupId,
    })
    .from(schema.team)
    .innerJoin(schema.seasonTeam, eq(schema.team.id, schema.seasonTeam.teamId))
    .innerJoin(schema.season, eq(schema.seasonTeam.seasonId, schema.season.id))
    .innerJoin(schema.category, eq(schema.team.categoryId, schema.category.id))
    .where(and(...conditions));
};

type UpsertPlayerInput = {
  id?: string;
  name: string;
  jerseyNumber: string;
  positionId: string;
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
  isFarAway?: boolean;
  seasonId: string;
  players: UpsertPlayerInput[];
};

export const upsertTeam = async (db: Database, params: UpsertTeamParams) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured to exclude from teamParams
  const { id, players, seasonId, ...teamParams } = params;
  const { isFarAway, ...restTeamParams } = teamParams;
  const teamId = id ?? uuidv4();

  const teamInsertValues = {
    ...restTeamParams,
    ...(isFarAway !== undefined && { isFarAway: isFarAway ? 1 : 0 }),
  };

  await db.transaction(async (tx) => {
    await tx
      .insert(schema.team)
      .values({
        id: teamId,
        ...teamInsertValues,
      })
      .onConflictDoUpdate({
        target: [schema.team.id],
        set: teamInsertValues,
      });

    await tx
      .insert(schema.seasonTeam)
      .values({
        seasonId: params.seasonId,
        teamId,
      })
      .onConflictDoNothing();

    const existingPlayers = await tx
      .select({
        id: schema.player.id,
        name: schema.player.name,
        jerseyNumber: schema.player.jerseyNumber,
        positionId: schema.player.positionId,
      })
      .from(schema.player)
      .where(eq(schema.player.teamId, teamId));

    const existingById = new Map(existingPlayers.map((p) => [p.id, p]));
    const submittedById = new Map<string, UpsertPlayerInput>();
    for (const p of players) {
      if (p.id) submittedById.set(p.id, p);
    }

    const toDelete: string[] = [];
    for (const { id: playerId } of existingPlayers) {
      if (!submittedById.has(playerId)) toDelete.push(playerId);
    }

    const toUpdate: UpsertPlayerInput[] = [];
    const toInsert: UpsertPlayerInput[] = [];
    for (const player of players) {
      if (player.id) {
        const existing = existingById.get(player.id);
        if (!existing) {
          throw new Error(`Player ${player.id} does not belong to team ${teamId}`);
        }
        const changed =
          existing.name !== player.name ||
          existing.jerseyNumber !== player.jerseyNumber ||
          existing.positionId !== player.positionId;
        if (changed) toUpdate.push(player);
      } else {
        toInsert.push(player);
      }
    }

    if (toDelete.length > 0) {
      await tx.delete(schema.player).where(inArray(schema.player.id, toDelete));
    }

    for (const player of toUpdate) {
      if (!player.id) continue;
      await tx
        .update(schema.player)
        .set({
          name: player.name,
          jerseyNumber: player.jerseyNumber,
          positionId: player.positionId,
        })
        .where(eq(schema.player.id, player.id));
    }

    if (toInsert.length > 0) {
      await tx.insert(schema.player).values(
        toInsert.map((player) => ({
          id: uuidv4(),
          name: player.name,
          jerseyNumber: player.jerseyNumber,
          positionId: player.positionId,
          teamId,
        })),
      );
    }
  });

  const [team] = await db.select().from(schema.team).where(eq(schema.team.id, teamId));
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

export const deleteTeam = async (db: Database, id: string) => {
  await db.transaction(async (tx) => {
    await tx.delete(schema.player).where(eq(schema.player.teamId, id));
    await tx.delete(schema.team).where(eq(schema.team.id, id));
  });

  return { success: true };
};

export const updateTeamIsFarAway = async (
  db: Database,
  teamId: string,
  isFarAway: boolean,
) => {
  await db
    .update(schema.team)
    .set({ isFarAway: isFarAway ? 1 : 0 })
    .where(eq(schema.team.id, teamId));
};
