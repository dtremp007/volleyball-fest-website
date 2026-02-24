import type { TRPCRouterRecord } from "@trpc/server";
import { format } from "date-fns";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  autoScheduleMatchups,
  clearMatchupPlacementsForSeason,
  configureGroupsAndGenerateMatchups,
  createEvent,
  deleteEvent,
  deleteMatchupsForSeason,
  generateMatchupsForSeason,
  getEventsBySeasonId,
  getMatchupsBySeasonId,
  getPublicSchedule,
  getScheduleConfig,
  hasMatchupsForSeason,
  saveMatchupScorecard,
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
      const [matchups, events] = await Promise.all([
        getMatchupsBySeasonId(db, input.seasonId),
        getEventsBySeasonId(db, input.seasonId),
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
        hasMatchups: matchups.length > 0,
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
   * One-shot: Configure groups and generate matchups
   * Takes all group configurations and team assignments, persists everything,
   * and generates round-robin matchups in a single operation
   */
  generateWithGroups: protectedProcedure
    .input(
      z.object({
        seasonId: z.string(),
        categoryConfigs: z.array(
          z.object({
            categoryId: z.string(),
            groups: z.array(
              z.object({
                name: z.string(),
                teamIds: z.array(z.string()),
              }),
            ),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await configureGroupsAndGenerateMatchups(
        db,
        input.seasonId,
        input.categoryConfigs,
      );
      return result;
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
   * Regenerate schedule placements using existing events
   */
  regenerateSchedule: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .mutation(async ({ input }) => {
      const [events, scheduleConfig] = await Promise.all([
        getEventsBySeasonId(db, input.seasonId),
        getScheduleConfig(db, input.seasonId),
      ]);
      await clearMatchupPlacementsForSeason(db, input.seasonId);

      return await autoScheduleMatchups(
        db,
        input.seasonId,
        events.map((event) => event.id),
        scheduleConfig?.gamesPerEvening ?? 7,
      );
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

  /**
   * Generate schedule: create events from dates and auto-schedule matchups
   * This will:
   * 1. Generate matchups if they don't exist
   * 2. Create events from the selected dates
   * 3. Auto-schedule matchups across events and courts
   */
  generateSchedule: protectedProcedure
    .input(
      z.object({
        seasonId: z.string(),
        dates: z.array(z.string().min(1, "Date cannot be empty")).min(1, "At least one date is required"),
        defaultStartTime: z.string(),
        gamesPerEvening: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      const { seasonId, gamesPerEvening } = input;
      // Normalize: trim, filter empty, dedupe
      const dates = [...new Set(input.dates.map((d) => d.trim()).filter(Boolean))];
      if (dates.length === 0) {
        throw new Error("At least one valid date is required");
      }

      // Generate matchups if they don't exist
      const hasMatchups = await hasMatchupsForSeason(db, seasonId);
      if (!hasMatchups) {
        await generateMatchupsForSeason(db, seasonId);
      }

      // Replace existing schedule: delete all events for this season so matchups become unscheduled
      const existingEvents = await getEventsBySeasonId(db, seasonId);
      for (const event of existingEvents) {
        await deleteEvent(db, event.id);
      }

      // Create events from dates
      const eventIds: string[] = [];
      for (const date of dates) {
        const event = await createEvent(db, {
          seasonId,
          name: format(new Date(`${date}T12:00:00`), "MMM d, yyyy"),
          date,
        });
        eventIds.push(event.id);
      }

      // Auto-schedule matchups across events
      const scheduleResult = await autoScheduleMatchups(
        db,
        seasonId,
        eventIds,
        gamesPerEvening,
      );

      return {
        success: true,
        eventsCreated: eventIds.length,
        eventIds,
        scheduledCount: scheduleResult.scheduledCount,
        unscheduledCount: scheduleResult.unscheduledCount,
      };
    }),

  saveScorecard: protectedProcedure
    .input(
      z.object({
        seasonId: z.string(),
        matchupId: z.string(),
        bestOf: z.number().int().positive(),
        sets: z
          .array(
            z.object({
              set: z.number().int().positive(),
              teamAScore: z.number().int().min(0),
              teamBScore: z.number().int().min(0),
            }),
          )
          .superRefine((sets, ctx) => {
            const seen = new Set<number>();
            for (const setRow of sets) {
              if (seen.has(setRow.set)) {
                ctx.addIssue({
                  code: "custom",
                  message: "Duplicate set number",
                });
              }
              seen.add(setRow.set);
            }
          }),
      }),
    )
    .mutation(async ({ input }) => {
      await saveMatchupScorecard(db, input);
      return { success: true };
    }),
} satisfies TRPCRouterRecord;
