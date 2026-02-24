import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  createCmsEntry,
  deleteCmsEntry,
  getAllCmsEntries,
  getCmsEntriesByRootName,
  getCmsEntryById,
  getContent,
  getRootCmsEntries,
  updateCmsEntry,
  updateContent,
} from "~/lib/db/queries/cms";
import { protectedProcedure, publicProcedure } from "~/trpc/init";
import {
  createCmsEntrySchema,
  updateCmsEntrySchema,
  updateContentSchema,
} from "~/validators/cms.validators";

export const cmsRouter = {
  // ============================================================================
  // Public Queries (for frontend content fetching)
  // ============================================================================

  /**
   * Get content by key with defaults (main utility for frontend)
   */
  getContent: publicProcedure
    .input(
      z.object({
        key: z.string(),
        defaults: z.record(z.string(), z.any()),
      }),
    )
    .query(async ({ input }) => {
      return await getContent(
        db,
        input.key,
        input.defaults as Record<string, string | number | boolean>,
      );
    }),

  /**
   * Get all entries for a root key (for admin tree view)
   */
  getByRootName: publicProcedure
    .input(z.object({ rootName: z.string() }))
    .query(async ({ input }) => {
      return await getCmsEntriesByRootName(db, input.rootName);
    }),

  // ============================================================================
  // Protected Queries (admin only)
  // ============================================================================

  /**
   * Get all CMS entries (for admin overview)
   */
  getAll: protectedProcedure.query(async () => {
    return await getAllCmsEntries(db);
  }),

  /**
   * Get all root-level entries (for admin sidebar)
   */
  getRoots: protectedProcedure.query(async () => {
    return await getRootCmsEntries(db);
  }),

  /**
   * Get a single entry by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getCmsEntryById(db, input.id);
    }),

  // ============================================================================
  // Protected Mutations (admin only)
  // ============================================================================

  /**
   * Create a new CMS entry
   */
  create: protectedProcedure.input(createCmsEntrySchema).mutation(async ({ input }) => {
    return await createCmsEntry(db, input);
  }),

  /**
   * Update an existing CMS entry
   */
  update: protectedProcedure
    .input(z.object({ id: z.string(), data: updateCmsEntrySchema }))
    .mutation(async ({ input }) => {
      return await updateCmsEntry(db, input.id, input.data);
    }),

  /**
   * Update content by path (e.g., "hero.title")
   */
  updateContent: protectedProcedure
    .input(updateContentSchema)
    .mutation(async ({ input }) => {
      await updateContent(
        db,
        input.rootKey,
        input.path,
        input.value as string | number | boolean,
      );
      return { success: true };
    }),

  /**
   * Delete a CMS entry and all its children
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await deleteCmsEntry(db, input.id);
    }),
} satisfies TRPCRouterRecord;
