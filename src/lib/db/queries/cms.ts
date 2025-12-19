import { eq, isNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { Database } from "~/lib/db";
import * as schema from "~/lib/db/schema";
import type { CmsValueType } from "~/lib/db/schema/cms.schema";

// ============================================================================
// Types
// ============================================================================

export interface CmsEntry {
  id: string;
  name: string;
  value: string | null;
  valueType: CmsValueType;
  meta: string | null;
  parentId: string | null;
}

export interface CmsMeta {
  label?: string;
  description?: string;
  placeholder?: string;
  options?: string[]; // For select/enum fields
}

// ============================================================================
// Core CRUD Operations
// ============================================================================

export const getAllCmsEntries = async (db: Database) => {
  return await db.select().from(schema.cms);
};

export const getCmsEntriesByRootName = async (db: Database, rootName: string) => {
  // First find the root entry
  const [root] = await db
    .select()
    .from(schema.cms)
    .where(eq(schema.cms.name, rootName))
    .limit(1);

  if (!root) return [];

  // Get all descendants by walking the tree
  return await getDescendants(db, root.id, [root]);
};

const getDescendants = async (
  db: Database,
  parentId: string,
  accumulated: CmsEntry[],
): Promise<CmsEntry[]> => {
  const children = await db
    .select()
    .from(schema.cms)
    .where(eq(schema.cms.parentId, parentId));

  if (children.length === 0) return accumulated;

  const allChildren = [...accumulated, ...children];

  for (const child of children) {
    const descendants = await getDescendants(db, child.id, []);
    allChildren.push(...descendants);
  }

  return allChildren;
};

export const getCmsEntryById = async (db: Database, id: string) => {
  const [entry] = await db
    .select()
    .from(schema.cms)
    .where(eq(schema.cms.id, id));
  return entry;
};

export const getRootCmsEntries = async (db: Database) => {
  return await db
    .select()
    .from(schema.cms)
    .where(isNull(schema.cms.parentId));
};

type CreateCmsEntryParams = {
  name: string;
  value?: string | null;
  valueType: CmsValueType;
  meta?: string | null;
  parentId?: string | null;
};

export const createCmsEntry = async (
  db: Database,
  params: CreateCmsEntryParams,
) => {
  const [entry] = await db
    .insert(schema.cms)
    .values({
      id: uuidv4(),
      name: params.name,
      value: params.value ?? null,
      valueType: params.valueType,
      meta: params.meta ?? null,
      parentId: params.parentId ?? null,
    })
    .returning();
  return entry;
};

type UpdateCmsEntryParams = {
  name?: string;
  value?: string | null;
  valueType?: CmsValueType;
  meta?: string | null;
};

export const updateCmsEntry = async (
  db: Database,
  id: string,
  params: UpdateCmsEntryParams,
) => {
  const [entry] = await db
    .update(schema.cms)
    .set(params)
    .where(eq(schema.cms.id, id))
    .returning();
  return entry;
};

export const deleteCmsEntry = async (db: Database, id: string) => {
  const [entry] = await db
    .delete(schema.cms)
    .where(eq(schema.cms.id, id))
    .returning();
  return entry;
};

// ============================================================================
// getContent Utility Function
// ============================================================================

type ContentValue =
  | string
  | number
  | boolean
  | Date
  | ContentValue[]
  | { [key: string]: ContentValue };

/**
 * Fetches content from the CMS by key, creating entries from defaults if missing.
 * Builds a nested object from the parent-child relationships.
 *
 * @param db - Database instance
 * @param key - Root content key (e.g., "hero", "footer")
 * @param defaults - Default values to use if content doesn't exist
 * @returns The content object with values from CMS or defaults
 */
export async function getContent<T extends Record<string, ContentValue>>(
  db: Database,
  key: string,
  defaults: T,
): Promise<T> {
  // Find or create the root entry
  let [root] = await db
    .select()
    .from(schema.cms)
    .where(eq(schema.cms.name, key))
    .limit(1);

  if (!root) {
    // Create root and all children from defaults
    root = await createCmsEntry(db, {
      name: key,
      valueType: "object",
      meta: JSON.stringify({ label: key }),
    });

    await createChildrenFromDefaults(db, root.id, defaults);

    return defaults;
  }

  // Fetch all entries for this key
  const entries = await getCmsEntriesByRootName(db, key);

  // Build the nested object from entries
  const result = buildNestedObject(entries, root.id) as T;

  // Merge with defaults to ensure all keys exist
  return mergeWithDefaults(result, defaults);
}

async function createChildrenFromDefaults(
  db: Database,
  parentId: string,
  defaults: Record<string, ContentValue>,
): Promise<void> {
  for (const [name, value] of Object.entries(defaults)) {
    const valueType = inferValueType(value);
    const entry = await createCmsEntry(db, {
      name,
      value: serializeValue(value, valueType),
      valueType,
      meta: JSON.stringify({ label: formatLabel(name) }),
      parentId,
    });

    // Recursively create children for objects
    if (valueType === "object" && typeof value === "object" && value !== null && !Array.isArray(value)) {
      await createChildrenFromDefaults(db, entry.id, value as Record<string, ContentValue>);
    }
  }
}

function inferValueType(value: ContentValue): CmsValueType {
  if (value === null || value === undefined) return "string";
  if (typeof value === "string") {
    // Check if it looks like a file URL
    if (value.startsWith("http") && /\.(jpg|jpeg|png|gif|webp|svg|pdf)$/i.test(value)) {
      return "file";
    }
    // Check if it looks like a date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return "date";
    }
    return "string";
  }
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (value instanceof Date) return "date";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  return "string";
}

function serializeValue(value: ContentValue, valueType: CmsValueType): string | null {
  if (value === null || value === undefined) return null;

  switch (valueType) {
    case "string":
    case "file":
      return String(value);
    case "number":
      return String(value);
    case "boolean":
      return value ? "true" : "false";
    case "date":
      return value instanceof Date ? value.toISOString() : String(value);
    case "array":
    case "object":
      return JSON.stringify(value);
    default:
      return String(value);
  }
}

function deserializeValue(value: string | null, valueType: CmsValueType): ContentValue {
  if (value === null || value === undefined) {
    switch (valueType) {
      case "number": return 0;
      case "boolean": return false;
      case "array": return [];
      case "object": return {};
      default: return "";
    }
  }

  switch (valueType) {
    case "string":
    case "file":
      return value;
    case "number":
      return parseFloat(value) || 0;
    case "boolean":
      return value === "true";
    case "date":
      return value;
    case "array":
    case "object":
      try {
        return JSON.parse(value);
      } catch {
        return valueType === "array" ? [] : {};
      }
    default:
      return value;
  }
}

function buildNestedObject(
  entries: CmsEntry[],
  parentId: string,
): Record<string, ContentValue> {
  const result: Record<string, ContentValue> = {};
  const children = entries.filter((e) => e.parentId === parentId);

  for (const child of children) {
    if (child.valueType === "object") {
      result[child.name] = buildNestedObject(entries, child.id);
    } else {
      result[child.name] = deserializeValue(child.value, child.valueType);
    }
  }

  return result;
}

function mergeWithDefaults<T extends Record<string, ContentValue>>(
  result: Record<string, ContentValue>,
  defaults: T,
): T {
  const merged: Record<string, ContentValue> = { ...defaults };

  for (const key of Object.keys(defaults)) {
    if (key in result) {
      const defaultValue = defaults[key];
      const resultValue = result[key];

      if (
        typeof defaultValue === "object" &&
        defaultValue !== null &&
        !Array.isArray(defaultValue) &&
        typeof resultValue === "object" &&
        resultValue !== null &&
        !Array.isArray(resultValue)
      ) {
        // Recursively merge objects
        merged[key] = mergeWithDefaults(
          resultValue as Record<string, ContentValue>,
          defaultValue as Record<string, ContentValue>,
        );
      } else {
        merged[key] = resultValue;
      }
    }
  }

  return merged as T;
}

function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

// ============================================================================
// Content Update Utility
// ============================================================================

/**
 * Updates a specific content value by key path (e.g., "hero.title")
 */
export async function updateContent(
  db: Database,
  rootKey: string,
  path: string,
  value: ContentValue,
): Promise<void> {
  const parts = path.split(".");
  const entries = await getCmsEntriesByRootName(db, rootKey);

  // Find the root
  const root = entries.find((e) => e.name === rootKey && e.parentId === null);
  if (!root) {
    throw new Error(`Content root "${rootKey}" not found`);
  }

  // Navigate to the target entry
  let currentParentId = root.id;
  let targetEntry: CmsEntry | undefined;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    targetEntry = entries.find(
      (e) => e.name === part && e.parentId === currentParentId,
    );

    if (!targetEntry) {
      throw new Error(`Content path "${path}" not found in "${rootKey}"`);
    }

    if (i < parts.length - 1) {
      currentParentId = targetEntry.id;
    }
  }

  if (!targetEntry) {
    throw new Error(`Content path "${path}" not found in "${rootKey}"`);
  }

  // Update the value
  await updateCmsEntry(db, targetEntry.id, {
    value: serializeValue(value, targetEntry.valueType),
  });
}
