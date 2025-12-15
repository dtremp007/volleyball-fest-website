import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  createSeason,
  deleteSeason,
  getCurrentSeason,
  getSeasonById,
  getSeasons,
  updateSeason,
} from "~/lib/db/queries/season";
import { protectedProcedure, publicProcedure } from "~/trpc/init";
import {
  createSeasonSchema,
  updateSeasonSchema,
} from "~/validators/season.validators";

export const seasonRouter = {
  getAll: protectedProcedure.query(async () => {
    return await getSeasons(db);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getSeasonById(db, input.id);
    }),

  getCurrent: publicProcedure.query(async () => {
    return await getCurrentSeason(db);
  }),

  create: protectedProcedure
    .input(createSeasonSchema)
    .mutation(async ({ input }) => {
      return await createSeason(db, input);
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: updateSeasonSchema }))
    .mutation(async ({ input }) => {
      return await updateSeason(db, input.id, input.data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await deleteSeason(db, input.id);
    }),
} satisfies TRPCRouterRecord;
