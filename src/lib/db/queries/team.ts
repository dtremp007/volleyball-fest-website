import { and, count, eq, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";

const teamColumns = {
  id: schema.team.id,
  name: schema.seasonTeam.name,
  logoUrl: schema.seasonTeam.logoUrl,
  captainName: schema.seasonTeam.captainName,
  captainPhone: schema.seasonTeam.captainPhone,
  coCaptainName: schema.seasonTeam.coCaptainName,
  coCaptainPhone: schema.seasonTeam.coCaptainPhone,
  unavailableDates: schema.seasonTeam.unavailableDates,
  comingFrom: schema.seasonTeam.comingFrom,
  isFarAway: schema.seasonTeam.isFarAway,
  season: {
    id: schema.season.id,
    name: schema.season.name,
  },
  notes: schema.seasonTeam.notes,
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

export type TeamPlayerInput = {
  id?: string;
  name: string;
  jerseyNumber: string;
  positionId: string;
};

export type TeamRegistrationInput = {
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
  notes?: string;
  players: TeamPlayerInput[];
};

export const getTeamForSeason = async (
  db: Database,
  seasonId: string,
  teamId: string,
) => {
  const [team] = await db
    .select(teamColumns)
    .from(schema.team)
    .innerJoin(
      schema.seasonTeam,
      and(
        eq(schema.team.id, schema.seasonTeam.teamId),
        eq(schema.seasonTeam.seasonId, seasonId),
      ),
    )
    .innerJoin(schema.season, eq(schema.seasonTeam.seasonId, schema.season.id))
    .innerJoin(schema.category, eq(schema.seasonTeam.categoryId, schema.category.id))
    .where(eq(schema.team.id, teamId));

  if (!team) return null;

  const players = await db
    .select(playerColumns)
    .from(schema.player)
    .where(and(eq(schema.player.teamId, teamId), eq(schema.player.seasonId, seasonId)))
    .leftJoin(schema.position, eq(schema.player.positionId, schema.position.id));

  return { ...team, players };
};

export const getTeamsBySeasonId = async (
  db: Database,
  seasonId: string,
  categoryId?: string,
) => {
  const conditions = [eq(schema.seasonTeam.seasonId, seasonId)];
  if (categoryId) conditions.push(eq(schema.seasonTeam.categoryId, categoryId));

  return await db
    .select({ ...teamColumns, groupId: schema.seasonTeam.groupId })
    .from(schema.team)
    .innerJoin(schema.seasonTeam, eq(schema.team.id, schema.seasonTeam.teamId))
    .innerJoin(schema.season, eq(schema.seasonTeam.seasonId, schema.season.id))
    .innerJoin(schema.category, eq(schema.seasonTeam.categoryId, schema.category.id))
    .where(and(...conditions));
};

export const createTeamRegistration = async (
  db: Database,
  seasonId: string,
  input: TeamRegistrationInput,
) => {
  const teamId = uuidv4();
  const { players, isFarAway, ...registration } = input;

  await db.transaction(async (tx) => {
    await tx.insert(schema.team).values({ id: teamId });
    await tx.insert(schema.seasonTeam).values({
      seasonId,
      teamId,
      ...registration,
      isFarAway: isFarAway ? 1 : 0,
    });

    if (players.length) {
      await tx.insert(schema.player).values(
        players.map((player) => ({
          id: uuidv4(),
          name: player.name,
          jerseyNumber: player.jerseyNumber,
          positionId: player.positionId,
          teamId,
          seasonId,
        })),
      );
    }
  });

  return { id: teamId, seasonId };
};

export const updateTeamForSeason = async (
  db: Database,
  seasonId: string,
  teamId: string,
  input: TeamRegistrationInput,
) => {
  const existing = await getTeamForSeason(db, seasonId, teamId);
  if (!existing) throw new Error("Team registration not found");

  const { players, isFarAway, ...registration } = input;
  await db.transaction(async (tx) => {
    await tx
      .update(schema.seasonTeam)
      .set({ ...registration, isFarAway: isFarAway ? 1 : 0 })
      .where(
        and(
          eq(schema.seasonTeam.seasonId, seasonId),
          eq(schema.seasonTeam.teamId, teamId),
        ),
      );

    const existingPlayers = await tx
      .select({ id: schema.player.id })
      .from(schema.player)
      .where(and(eq(schema.player.seasonId, seasonId), eq(schema.player.teamId, teamId)));
    const existingIds = new Set(existingPlayers.map((player) => player.id));
    const submittedIds = new Set(
      players.flatMap((player) => (player.id ? [player.id] : [])),
    );
    const deleteIds = existingPlayers
      .filter((player) => !submittedIds.has(player.id))
      .map((player) => player.id);

    if (deleteIds.length) {
      await tx.delete(schema.player).where(inArray(schema.player.id, deleteIds));
    }

    for (const player of players) {
      if (player.id) {
        if (!existingIds.has(player.id)) {
          throw new Error(`Player ${player.id} does not belong to this registration`);
        }
        await tx
          .update(schema.player)
          .set({
            name: player.name,
            jerseyNumber: player.jerseyNumber,
            positionId: player.positionId,
          })
          .where(
            and(
              eq(schema.player.id, player.id),
              eq(schema.player.seasonId, seasonId),
              eq(schema.player.teamId, teamId),
            ),
          );
      } else {
        await tx.insert(schema.player).values({
          id: uuidv4(),
          name: player.name,
          jerseyNumber: player.jerseyNumber,
          positionId: player.positionId,
          teamId,
          seasonId,
        });
      }
    }
  });

  return { id: teamId, seasonId };
};

export const copyTeamsToSeason = async (
  db: Database,
  sourceSeasonId: string,
  targetSeasonId: string,
  teamIds: string[],
) => {
  if (!teamIds.length || sourceSeasonId === targetSeasonId) return { count: 0 };

  const registrations = await db
    .select()
    .from(schema.seasonTeam)
    .where(
      and(
        eq(schema.seasonTeam.seasonId, sourceSeasonId),
        inArray(schema.seasonTeam.teamId, teamIds),
      ),
    );
  const sourcePlayers = await db
    .select()
    .from(schema.player)
    .where(
      and(
        eq(schema.player.seasonId, sourceSeasonId),
        inArray(schema.player.teamId, teamIds),
      ),
    );

  let copiedCount = 0;
  await db.transaction(async (tx) => {
    for (const registration of registrations) {
      const inserted = await tx
        .insert(schema.seasonTeam)
        .values({ ...registration, seasonId: targetSeasonId, groupId: null })
        .onConflictDoNothing()
        .returning({ teamId: schema.seasonTeam.teamId });
      if (!inserted.length) continue;

      copiedCount += 1;
      const players = sourcePlayers.filter(
        (player) => player.teamId === registration.teamId,
      );
      if (players.length) {
        await tx.insert(schema.player).values(
          players.map((player) => ({
            ...player,
            id: uuidv4(),
            seasonId: targetSeasonId,
          })),
        );
      }
    }
  });

  return { count: copiedCount };
};

const publicTeamColumns = {
  id: schema.team.id,
  name: schema.seasonTeam.name,
  logoUrl: schema.seasonTeam.logoUrl,
  category: schema.category.name,
  categoryId: schema.seasonTeam.categoryId,
};

export type PublicTeamSummary = {
  id: string;
  name: string;
  logoUrl: string;
  category: string;
  categoryId: string | null;
  playerCount: number;
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

export const getPublicTeamsBySeasonId = async (
  db: Database,
  seasonId: string,
): Promise<PublicTeamSummary[]> => {
  const teams = await db
    .select(publicTeamColumns)
    .from(schema.team)
    .innerJoin(schema.seasonTeam, eq(schema.team.id, schema.seasonTeam.teamId))
    .innerJoin(schema.category, eq(schema.seasonTeam.categoryId, schema.category.id))
    .where(eq(schema.seasonTeam.seasonId, seasonId));

  if (!teams.length) return [];
  const teamIds = teams.map((team) => team.id);
  const playerCounts = await db
    .select({
      teamId: schema.player.teamId,
      playerCount: count(),
    })
    .from(schema.player)
    .where(
      and(eq(schema.player.seasonId, seasonId), inArray(schema.player.teamId, teamIds)),
    )
    .groupBy(schema.player.teamId);

  const countByTeamId = new Map(
    playerCounts.map((row) => [row.teamId, row.playerCount]),
  );

  return teams.map((team) => ({
    ...team,
    playerCount: countByTeamId.get(team.id) ?? 0,
  }));
};

export const getPublicTeamById = async (
  db: Database,
  seasonId: string,
  teamId: string,
): Promise<PublicTeam | null> => {
  const [team] = await db
    .select(publicTeamColumns)
    .from(schema.team)
    .innerJoin(schema.seasonTeam, eq(schema.team.id, schema.seasonTeam.teamId))
    .innerJoin(schema.category, eq(schema.seasonTeam.categoryId, schema.category.id))
    .where(and(eq(schema.seasonTeam.seasonId, seasonId), eq(schema.team.id, teamId)))
    .limit(1);

  if (!team) return null;

  const players = await db
    .select({
      id: schema.player.id,
      name: schema.player.name,
      jerseyNumber: schema.player.jerseyNumber,
      position: schema.position.name,
    })
    .from(schema.player)
    .leftJoin(schema.position, eq(schema.player.positionId, schema.position.id))
    .where(and(eq(schema.player.seasonId, seasonId), eq(schema.player.teamId, teamId)));

  return {
    ...team,
    players,
  };
};

export const removeTeamFromSeason = async (
  db: Database,
  seasonId: string,
  teamId: string,
) => {
  const [regularReference] = await db
    .select({ id: schema.matchup.id })
    .from(schema.matchup)
    .where(
      and(
        eq(schema.matchup.seasonId, seasonId),
        // Keep this expression SQL-portable through Drizzle.
        inArray(schema.matchup.teamAId, [teamId]),
      ),
    )
    .limit(1);
  const [regularReferenceB] = await db
    .select({ id: schema.matchup.id })
    .from(schema.matchup)
    .where(and(eq(schema.matchup.seasonId, seasonId), eq(schema.matchup.teamBId, teamId)))
    .limit(1);
  const [playoffReference] = await db
    .select({ id: schema.playoffMatchupTeam.id })
    .from(schema.playoffMatchupTeam)
    .innerJoin(
      schema.playoffMatchup,
      eq(schema.playoffMatchupTeam.matchupId, schema.playoffMatchup.id),
    )
    .where(
      and(
        eq(schema.playoffMatchup.seasonId, seasonId),
        eq(schema.playoffMatchupTeam.teamId, teamId),
      ),
    )
    .limit(1);

  if (regularReference || regularReferenceB || playoffReference) {
    throw new Error(
      "This team is used by the season schedule. Remove or regenerate its matchups first.",
    );
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(schema.seasonTeam)
      .where(
        and(
          eq(schema.seasonTeam.seasonId, seasonId),
          eq(schema.seasonTeam.teamId, teamId),
        ),
      );
    const [remaining] = await tx
      .select({ teamId: schema.seasonTeam.teamId })
      .from(schema.seasonTeam)
      .where(eq(schema.seasonTeam.teamId, teamId))
      .limit(1);
    if (!remaining) await tx.delete(schema.team).where(eq(schema.team.id, teamId));
  });

  return { success: true };
};

export const updateTeamIsFarAway = async (
  db: Database,
  seasonId: string,
  teamId: string,
  isFarAway: boolean,
) => {
  await db
    .update(schema.seasonTeam)
    .set({ isFarAway: isFarAway ? 1 : 0 })
    .where(
      and(eq(schema.seasonTeam.seasonId, seasonId), eq(schema.seasonTeam.teamId, teamId)),
    );
};
