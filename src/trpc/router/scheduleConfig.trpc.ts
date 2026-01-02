import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import { getScheduleConfig, upsertScheduleConfig } from "~/lib/db/queries/schedule";
import { protectedProcedure } from "~/trpc/init";

export const scheduleConfigRouter = {
  /**
   * Get schedule config for a season
   */
  get: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .query(async ({ input }) => {
      return await getScheduleConfig(db, input.seasonId);
    }),

  /**
   * Create or update schedule config for a season
   */
  upsert: protectedProcedure
    .input(
      z.object({
        seasonId: z.string(),
        defaultStartTime: z.string(), // e.g., "4:15 PM"
        gamesPerEvening: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      return await upsertScheduleConfig(db, input);
    }),
} satisfies TRPCRouterRecord;
