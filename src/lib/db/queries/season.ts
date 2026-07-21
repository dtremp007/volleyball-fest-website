import { desc, eq } from "drizzle-orm";
import { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";
import type { SeasonState } from "~/lib/db/schema/team.schema";
import { nextAvailableSeasonId, slugifySeasonId } from "~/lib/season-id";

export const getSeasons = async (db: Database) => {
  return await db.select().from(schema.season).orderBy(desc(schema.season.startDate));
};

export const getSeasonById = async (db: Database, id: string) => {
  const [season] = await db.select().from(schema.season).where(eq(schema.season.id, id));
  return season;
};

export const getSeasonByState = async (db: Database, state: SeasonState) => {
  const [season] = await db
    .select()
    .from(schema.season)
    .orderBy(desc(schema.season.startDate))
    .where(eq(schema.season.state, state));

  return season;
};

export const selectPublicSeasonContext = <
  T extends { state: SeasonState | null; startDate: string },
>(
  seasons: T[],
) => {
  const sorted = [...seasons].sort((a, b) => b.startDate.localeCompare(a.startDate));
  return {
    competitionSeason:
      sorted.find((season) => season.state === "active") ??
      sorted.find((season) => season.state === "completed") ??
      null,
    registrationSeason: sorted.find((season) => season.state === "signup_open") ?? null,
  };
};

export const getPublicSeasonContext = async (db: Database) => {
  const seasons = await getSeasons(db);
  return selectPublicSeasonContext(seasons);
};

type CreateSeasonParams = {
  name: string;
  startDate: string;
  endDate: string;
};

export const createSeason = async (db: Database, params: CreateSeasonParams) => {
  const baseId = slugifySeasonId(params.name);
  if (!baseId) {
    throw new Error("Season name must include letters or numbers to build an id.");
  }

  const seasons = await getSeasons(db);
  const id = nextAvailableSeasonId(
    baseId,
    seasons.map((season) => season.id),
  );

  const [season] = await db
    .insert(schema.season)
    .values({
      id,
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

export const updateSeasonState = async (db: Database, id: string, state: SeasonState) => {
  const [season] = await db
    .update(schema.season)
    .set({ state })
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
