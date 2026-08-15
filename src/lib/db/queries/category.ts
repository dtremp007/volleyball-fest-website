import { asc, eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";

export const getCategories = async (db: Database) => {
  return await db
    .select()
    .from(schema.category)
    .orderBy(asc(schema.category.sortOrder), asc(schema.category.name));
};

export const getCategoryById = async (db: Database, id: string) => {
  const [category] = await db
    .select()
    .from(schema.category)
    .where(eq(schema.category.id, id));
  return category;
};

type CreateCategoryParams = {
  name: string;
  description: string;
  color: string;
};

export const createCategory = async (db: Database, params: CreateCategoryParams) => {
  const [maxRow] = await db
    .select({ maxSortOrder: sql<number>`max(${schema.category.sortOrder})` })
    .from(schema.category);
  const sortOrder = (maxRow?.maxSortOrder ?? -1) + 1;

  const [category] = await db
    .insert(schema.category)
    .values({
      id: uuidv4(),
      sortOrder,
      ...params,
    })
    .returning();
  return category;
};

type UpdateCategoryParams = {
  name?: string;
  description?: string;
  color?: string;
};

export const updateCategory = async (
  db: Database,
  id: string,
  params: UpdateCategoryParams,
) => {
  const [category] = await db
    .update(schema.category)
    .set(params)
    .where(eq(schema.category.id, id))
    .returning();
  return category;
};

export const reorderCategories = async (db: Database, orderedIds: string[]) => {
  const existing = await getCategories(db);
  const existingIds = new Set(existing.map((category) => category.id));
  const uniqueOrdered = [...new Set(orderedIds)].filter((id) => existingIds.has(id));

  if (uniqueOrdered.length !== existing.length) {
    throw new Error("Category order must include every category exactly once.");
  }

  for (let i = 0; i < uniqueOrdered.length; i++) {
    const id = uniqueOrdered[i];
    if (!id) continue;
    await db
      .update(schema.category)
      .set({ sortOrder: i })
      .where(eq(schema.category.id, id));
  }

  return await getCategories(db);
};

export const deleteCategory = async (db: Database, id: string) => {
  const [category] = await db
    .delete(schema.category)
    .where(eq(schema.category.id, id))
    .returning();
  return category;
};
