import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  createPosition,
  deletePosition,
  getPositionById,
  getPositions,
  updatePosition,
} from "~/lib/db/queries/position";
import { permix, protectedProcedure, publicProcedure } from "~/trpc/init";
import {
  createPositionSchema,
  updatePositionSchema,
} from "~/validators/position.validators";

export const positionRouter = {
  getAll: publicProcedure.query(async () => {
    return await getPositions(db);
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getPositionById(db, input.id);
    }),

  create: protectedProcedure
    .use(permix.checkMiddleware("settings.manage"))
    .input(createPositionSchema)
    .mutation(async ({ input }) => {
      return await createPosition(db, input);
    }),

  update: protectedProcedure
    .use(permix.checkMiddleware("settings.manage"))
    .input(z.object({ id: z.string(), data: updatePositionSchema }))
    .mutation(async ({ input }) => {
      return await updatePosition(db, input.id, input.data);
    }),

  delete: protectedProcedure
    .use(permix.checkMiddleware("settings.manage"))
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await deletePosition(db, input.id);
    }),
} satisfies TRPCRouterRecord;
