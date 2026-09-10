import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  reorderCategories,
  updateCategory,
} from "~/lib/db/queries/category";
import { permix, protectedProcedure, publicProcedure } from "~/trpc/init";
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
    .use(permix.checkMiddleware("settings.manage"))
    .input(createCategorySchema)
    .mutation(async ({ input }) => {
      return await createCategory(db, input);
    }),

  update: protectedProcedure
    .use(permix.checkMiddleware("settings.manage"))
    .input(z.object({ id: z.string(), data: updateCategorySchema }))
    .mutation(async ({ input }) => {
      return await updateCategory(db, input.id, input.data);
    }),

  delete: protectedProcedure
    .use(permix.checkMiddleware("settings.manage"))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await deleteCategory(db, input.id);
    }),

  reorder: protectedProcedure
    .use(permix.checkMiddleware("settings.manage"))
    .input(z.object({ orderedIds: z.array(z.string()).min(1) }))
    .mutation(async ({ input }) => {
      return await reorderCategories(db, input.orderedIds);
    }),
} satisfies TRPCRouterRecord;
