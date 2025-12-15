import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";

export const getCategories = async (db: Database) => {
  return await db.select().from(schema.category);
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
};

export const createCategory = async (db: Database, params: CreateCategoryParams) => {
  const [category] = await db
    .insert(schema.category)
    .values({
      id: uuidv4(),
      ...params,
    })
    .returning();
  return category;
};

type UpdateCategoryParams = {
  name?: string;
  description?: string;
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

export const deleteCategory = async (db: Database, id: string) => {
  const [category] = await db
    .delete(schema.category)
    .where(eq(schema.category.id, id))
    .returning();
  return category;
};
