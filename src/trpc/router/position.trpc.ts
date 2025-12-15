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
import { protectedProcedure } from "~/trpc/init";
import {
  createPositionSchema,
  updatePositionSchema,
} from "~/validators/position.validators";

export const positionRouter = {
  getAll: protectedProcedure.query(async () => {
    return await getPositions(db);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getPositionById(db, input.id);
    }),

  create: protectedProcedure
    .input(createPositionSchema)
    .mutation(async ({ input }) => {
      return await createPosition(db, input);
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: updatePositionSchema }))
    .mutation(async ({ input }) => {
      return await updatePosition(db, input.id, input.data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await deletePosition(db, input.id);
    }),
} satisfies TRPCRouterRecord;
