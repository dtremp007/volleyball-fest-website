import { relations } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cmsValueTypeEnum = [
  "string",
  "number",
  "date",
  "boolean",
  "array",
  "object",
  "file",
] as const;

export type CmsValueType = (typeof cmsValueTypeEnum)[number];

export const cms = sqliteTable("cms", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  value: text("value"), // JSON-stringified for complex types
  valueType: text("value_type").notNull().$type<CmsValueType>().default("string"),
  meta: text("meta"), // JSON for additional config (label, description, etc.)
  parentId: text("parent_id").references((): ReturnType<typeof text> => cms.id, {
    onDelete: "cascade",
  }),
});

export const cmsRelations = relations(cms, ({ one, many }) => ({
  parent: one(cms, {
    fields: [cms.parentId],
    references: [cms.id],
    relationName: "cms_hierarchy",
  }),
  children: many(cms, {
    relationName: "cms_hierarchy",
  }),
}));
