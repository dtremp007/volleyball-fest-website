import { desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";

export const getSchedulePresets = async (db: Database, seasonId: string) => {
  return await db
    .select()
    .from(schema.schedulePreset)
    .where(eq(schema.schedulePreset.seasonId, seasonId))
    .orderBy(desc(schema.schedulePreset.createdAt));
};

export const getSchedulePresetById = async (db: Database, id: string) => {
  const [preset] = await db
    .select()
    .from(schema.schedulePreset)
    .where(eq(schema.schedulePreset.id, id));
  return preset;
};

type CreateSchedulePresetParams = {
  seasonId: string;
  name: string;
  weightsJson: string;
};

export const createSchedulePreset = async (
  db: Database,
  params: CreateSchedulePresetParams,
) => {
  const [preset] = await db
    .insert(schema.schedulePreset)
    .values({
      id: uuidv4(),
      ...params,
    })
    .returning();
  return preset;
};

type UpdateSchedulePresetParams = {
  name?: string;
  weightsJson?: string;
};

export const updateSchedulePreset = async (
  db: Database,
  id: string,
  params: UpdateSchedulePresetParams,
) => {
  const [preset] = await db
    .update(schema.schedulePreset)
    .set(params)
    .where(eq(schema.schedulePreset.id, id))
    .returning();
  return preset;
};

export const deleteSchedulePreset = async (db: Database, id: string) => {
  const [preset] = await db
    .delete(schema.schedulePreset)
    .where(eq(schema.schedulePreset.id, id))
    .returning();
  return preset;
};

export const setActiveSchedulePreset = async (
  db: Database,
  seasonId: string,
  presetId: string | null,
) => {
  const [config] = await db
    .select({ id: schema.scheduleConfig.id })
    .from(schema.scheduleConfig)
    .where(eq(schema.scheduleConfig.seasonId, seasonId))
    .limit(1);

  if (!config) {
    throw new Error(
      `Schedule config not found for season "${seasonId}". Create schedule config before setting an active preset.`,
    );
  }

  const [updated] = await db
    .update(schema.scheduleConfig)
    .set({ activePresetId: presetId })
    .where(eq(schema.scheduleConfig.id, config.id))
    .returning();
  return updated;
};

export const getActiveSchedulePreset = async (db: Database, seasonId: string) => {
  const [row] = await db
    .select({
      preset: schema.schedulePreset,
    })
    .from(schema.scheduleConfig)
    .innerJoin(
      schema.schedulePreset,
      eq(schema.scheduleConfig.activePresetId, schema.schedulePreset.id),
    )
    .where(eq(schema.scheduleConfig.seasonId, seasonId))
    .limit(1);

  return row?.preset ?? null;
};
