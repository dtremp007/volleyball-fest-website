import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";

export const getPositions = async (db: Database) => {
  return await db.select().from(schema.position);
};

export const getPositionById = async (db: Database, id: string) => {
  const [position] = await db
    .select()
    .from(schema.position)
    .where(eq(schema.position.id, id));
  return position;
};

type CreatePositionParams = {
  name: string;
};

export const createPosition = async (db: Database, params: CreatePositionParams) => {
  const [position] = await db
    .insert(schema.position)
    .values({
      id: uuidv4(),
      ...params,
    })
    .returning();
  return position;
};

type UpdatePositionParams = {
  name?: string;
};

export const updatePosition = async (
  db: Database,
  id: string,
  params: UpdatePositionParams,
) => {
  const [position] = await db
    .update(schema.position)
    .set(params)
    .where(eq(schema.position.id, id))
    .returning();
  return position;
};

export const deletePosition = async (db: Database, id: string) => {
  const [position] = await db
    .delete(schema.position)
    .where(eq(schema.position.id, id))
    .returning();
  return position;
};
