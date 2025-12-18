import { desc, eq, gte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";

export const getSeasons = async (db: Database) => {
  return await db.select().from(schema.season);
};

export const getSeasonById = async (db: Database, id: string) => {
  const [season] = await db.select().from(schema.season).where(eq(schema.season.id, id));
  return season;
};

export const getCurrentSeason = async (db: Database) => {
  const today = new Date().toISOString().split("T")[0];
  const [season] = await db
    .select()
    .from(schema.season)
    .orderBy(desc(schema.season.startDate))
    .where(gte(schema.season.endDate, today));

  return season;
};

type CreateSeasonParams = {
  name: string;
  startDate: string;
  endDate: string;
};

export const createSeason = async (db: Database, params: CreateSeasonParams) => {
  const [season] = await db
    .insert(schema.season)
    .values({
      id: uuidv4(),
      ...params,
    })
    .returning();
  return season;
};

type UpdateSeasonParams = {
  name?: string;
  startDate?: string;
  endDate?: string;
};

export const updateSeason = async (
  db: Database,
  id: string,
  params: UpdateSeasonParams,
) => {
  const [season] = await db
    .update(schema.season)
    .set(params)
    .where(eq(schema.season.id, id))
    .returning();
  return season;
};

export const deleteSeason = async (db: Database, id: string) => {
  const [season] = await db
    .delete(schema.season)
    .where(eq(schema.season.id, id))
    .returning();
  return season;
};
