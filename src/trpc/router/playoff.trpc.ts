import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  clearPlayoffGraph,
  generatePlayoffGraph,
  getPlayoffGraph,
  hasPlayoffScores,
} from "~/lib/db/queries/playoff";
import { protectedProcedure } from "~/trpc/init";

const playoffCategoryInput = z.object({
  seasonId: z.string(),
  categoryId: z.string(),
});

export const playoffRouter = {
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

  generate: protectedProcedure.input(playoffCategoryInput).mutation(async ({ input }) => {
    return await generatePlayoffGraph(db, input);
  }),

  clear: protectedProcedure.input(playoffCategoryInput).mutation(async ({ input }) => {
    await clearPlayoffGraph(db, input);
    return { ok: true };
  }),
} satisfies TRPCRouterRecord;
