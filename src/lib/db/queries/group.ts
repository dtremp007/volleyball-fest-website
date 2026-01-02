import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";

/**
 * Get all groups for a specific season and category
 */
export async function getGroupsBySeasonAndCategory(
  db: Database,
  seasonId: string,
  categoryId: string,
) {
  return await db
    .select({
      id: schema.group.id,
      name: schema.group.name,
      seasonId: schema.group.seasonId,
      categoryId: schema.group.categoryId,
    })
    .from(schema.group)
    .where(
      and(
        eq(schema.group.seasonId, seasonId),
        eq(schema.group.categoryId, categoryId),
      ),
    )
    .orderBy(schema.group.name);
}

/**
 * Create a new group for a season and category
 */
export async function createGroup(
  db: Database,
  params: { seasonId: string; categoryId: string; name: string },
) {
  const id = uuidv4();
  await db.insert(schema.group).values({ id, ...params });
  return { id, ...params };
}

/**
 * Assign a team to a group within a season
 */
export async function assignTeamToGroup(
  db: Database,
  seasonId: string,
  teamId: string,
  groupId: string | null,
) {
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

/**
 * Remove a team from its group (set groupId to null)
 */
export async function removeTeamFromGroup(
  db: Database,
  seasonId: string,
  teamId: string,
) {
  await assignTeamToGroup(db, seasonId, teamId, null);
}

/**
 * Delete a group and remove all team assignments to it
 */
export async function deleteGroup(db: Database, groupId: string) {
  await db.transaction(async (tx) => {
    // Remove all team assignments to this group
    await tx
      .update(schema.seasonTeam)
      .set({ groupId: null })
      .where(eq(schema.seasonTeam.groupId, groupId));

    // Delete the group
    await tx.delete(schema.group).where(eq(schema.group.id, groupId));
  });
}

/**
 * Get all teams in a specific group
 */
export async function getTeamsByGroup(
  db: Database,
  seasonId: string,
  groupId: string,
) {
  return await db
    .select({
      id: schema.team.id,
      name: schema.team.name,
      logoUrl: schema.team.logoUrl,
      categoryId: schema.team.categoryId,
    })
    .from(schema.team)
    .innerJoin(schema.seasonTeam, eq(schema.team.id, schema.seasonTeam.teamId))
    .where(
      and(
        eq(schema.seasonTeam.seasonId, seasonId),
        eq(schema.seasonTeam.groupId, groupId),
      ),
    );
}
