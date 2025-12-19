import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "~/lib/db/queries/category";
import { protectedProcedure, publicProcedure } from "~/trpc/init";
import {
  createCategorySchema,
  updateCategorySchema,
} from "~/validators/category.validators";

export const categoryRouter = {
  getAll: publicProcedure.query(async () => {
    return await getCategories(db);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getCategoryById(db, input.id);
    }),

  create: protectedProcedure
    .input(createCategorySchema)
    .mutation(async ({ input }) => {
      return await createCategory(db, input);
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: updateCategorySchema }))
    .mutation(async ({ input }) => {
      return await updateCategory(db, input.id, input.data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await deleteCategory(db, input.id);
    }),
} satisfies TRPCRouterRecord;
