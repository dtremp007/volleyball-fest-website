import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  clearPlayoffGraph,
  generatePlayoffGraph,
  getPlayoffGraph,
  getPlayoffGraphsBySeason,
  hasPlayoffScores,
} from "~/lib/db/queries/playoff";
import { protectedProcedure } from "~/trpc/init";

const playoffCategoryInput = z.object({
  seasonId: z.string(),
  categoryId: z.string(),
});

const generatePlayoffInput = playoffCategoryInput.extend({
  format: z.enum(["top-4", "top-5"]),
});

export const playoffRouter = {
  getSeasonGraphs: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .query(async ({ input }) => {
      return await getPlayoffGraphsBySeason(db, input.seasonId);
    }),

  getGraph: protectedProcedure.input(playoffCategoryInput).query(async ({ input }) => {
    const [graph, hasScores] = await Promise.all([
      getPlayoffGraph(db, input),
      hasPlayoffScores(db, input),
    ]);

    return {
      ...graph,
      hasScores,
    };
  }),

  generate: protectedProcedure.input(generatePlayoffInput).mutation(async ({ input }) => {
    return await generatePlayoffGraph(db, input);
  }),

  clear: protectedProcedure.input(playoffCategoryInput).mutation(async ({ input }) => {
    await clearPlayoffGraph(db, input);
    return { ok: true };
  }),
} satisfies TRPCRouterRecord;
