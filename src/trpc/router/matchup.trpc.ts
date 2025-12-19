import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  deleteMatchupsForSeason,
  generateMatchupsForSeason,
  getEventsBySeasonId,
  getMatchupsBySeasonId,
  getPublicSchedule,
  hasMatchupsForSeason,
  saveSchedule,
} from "~/lib/db/queries/schedule";
import { protectedProcedure, publicProcedure } from "~/trpc/init";

export const matchupRouter = {
  /**
   * Public: Get schedule for public display
   */
  getPublicSchedule: publicProcedure
    .input(
      z.object({
        seasonId: z.string(),
        upcomingOnly: z.boolean().optional(),
        limit: z.number().optional(),
      }),
    )
    .query(async ({ input }) => {
      return await getPublicSchedule(db, input.seasonId, {
        upcomingOnly: input.upcomingOnly,
        limit: input.limit,
      });
    }),

  /**
   * Get all matchups and events for a season
   */
  getBySeasonId: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .query(async ({ input }) => {
      const [matchups, events, hasMatchups] = await Promise.all([
        getMatchupsBySeasonId(db, input.seasonId),
        getEventsBySeasonId(db, input.seasonId),
        hasMatchupsForSeason(db, input.seasonId),
      ]);

      // Group matchups by category
      const matchupsByCategory = matchups.reduce(
        (acc, matchup) => {
          if (!acc[matchup.category]) acc[matchup.category] = [];
          acc[matchup.category].push(matchup);
          return acc;
        },
        {} as Record<string, typeof matchups>,
      );

      // Separate scheduled vs unscheduled
      const scheduled = matchups.filter((m) => m.eventId !== null);
      const unscheduled = matchups.filter((m) => m.eventId === null);

      return {
        hasMatchups,
        matchups,
        matchupsByCategory,
        scheduled,
        unscheduled,
        events,
        categories: Object.keys(matchupsByCategory),
      };
    }),

  /**
   * Check if matchups exist for a season
   */
  hasMatchups: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .query(async ({ input }) => {
      return await hasMatchupsForSeason(db, input.seasonId);
    }),

  /**
   * Generate round-robin matchups for a season
   */
  generate: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .mutation(async ({ input }) => {
      // Check if matchups already exist
      const exists = await hasMatchupsForSeason(db, input.seasonId);
      if (exists) {
        throw new Error("Matchups already exist for this season");
      }

      const count = await generateMatchupsForSeason(db, input.seasonId);
      return { generated: count };
    }),

  /**
   * Regenerate matchups (delete existing and create new)
   */
  regenerate: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .mutation(async ({ input }) => {
      await deleteMatchupsForSeason(db, input.seasonId);
      const count = await generateMatchupsForSeason(db, input.seasonId);
      return { generated: count };
    }),

  /**
   * Save the entire schedule (events + matchup placements)
   */
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
      await saveSchedule(db, input);
      return { success: true };
    }),
} satisfies TRPCRouterRecord;
