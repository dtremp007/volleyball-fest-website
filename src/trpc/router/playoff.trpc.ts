import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  clearPlayoffGraph,
  createDefaultPlayoffScheduleEvents,
  generatePlayoffGraph,
  getPlayoffGraph,
  getPlayoffGraphsBySeason,
  getPlayoffScheduleEventsBySeasonId,
  getPlayoffScheduleMatchupsBySeasonId,
  hasPlayoffScores,
  savePlayoffSchedule,
} from "~/lib/db/queries/playoff";
import { buildPlayoffScheduleBuilderStateResponse } from "~/lib/schedule/playoff-builder-state";
import { protectedProcedure } from "~/trpc/init";

const playoffCategoryInput = z.object({
  seasonId: z.string(),
  categoryId: z.string(),
});

const generatePlayoffInput = playoffCategoryInput.extend({
  format: z.enum(["top-4", "top-5"]),
});

export const playoffRouter = {
  getScheduleEvents: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .query(async ({ input }) => {
      return await getPlayoffScheduleEventsBySeasonId(db, input.seasonId);
    }),

  getScheduleBuilderState: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .query(async ({ input }) => {
      const [matchups, events] = await Promise.all([
        getPlayoffScheduleMatchupsBySeasonId(db, input.seasonId),
        getPlayoffScheduleEventsBySeasonId(db, input.seasonId),
      ]);

      return buildPlayoffScheduleBuilderStateResponse(matchups, events);
    }),

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

  createDefaultScheduleEvents: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .mutation(async ({ input }) => {
      const events = await createDefaultPlayoffScheduleEvents(db, input.seasonId);
      return { eventsCreated: events.length, events };
    }),

  saveSchedule: protectedProcedure
    .input(
      z.object({
        seasonId: z.string(),
        events: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            date: z.string(),
          }),
        ),
        matchups: z.array(
          z.object({
            id: z.string(),
            eventId: z.string().nullable(),
            courtId: z.string().nullable(),
            slotIndex: z.number().nullable(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      await savePlayoffSchedule(db, input);
      return { success: true };
    }),
} satisfies TRPCRouterRecord;
