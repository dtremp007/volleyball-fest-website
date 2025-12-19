import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  copyTeamsToSeason,
  deleteTeam,
  getPublicTeamsBySeasonId,
  getTeamById,
  getTeamsBySeasonId,
  upsertTeam,
} from "~/lib/db/queries/team";

import { protectedProcedure, publicProcedure } from "~/trpc/init";
import { signupFormSchema } from "~/validators/signup-form.validators";

export const teamRouter = {
  list: publicProcedure
    .input(
      z.object({ seasonId: z.string().optional(), categoryId: z.string().optional() }),
    )
    .query(async ({ input }) => {
      if (!input.seasonId) {
        return [];
      }

      const teams = await getTeamsBySeasonId(db, input.seasonId, input.categoryId);
      return teams;
    }),

  /**
   * Public endpoint to get teams with full rosters (no sensitive data)
   */
  listPublic: publicProcedure
    .input(z.object({ seasonId: z.string() }))
    .query(async ({ input }) => {
      return await getPublicTeamsBySeasonId(db, input.seasonId);
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const team = await getTeamById(db, input.id);
      return team ?? null;
    }),

  copyToSeason: protectedProcedure
    .input(z.object({ teamIds: z.array(z.string()), seasonId: z.string() }))
    .mutation(async ({ input }) => {
      const result = await copyTeamsToSeason(db, input.teamIds, input.seasonId);
      return result;
    }),
  upsert: publicProcedure.input(signupFormSchema).mutation(async ({ input }) => {
    const teamData = {
      ...input,
      unavailableDates: input.unavailableDates.join(","),
      comingFrom: input.comingFrom ?? "",
    };
    await upsertTeam(db, teamData);
    return { success: true };
  }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await deleteTeam(db, input.id);
    }),
} satisfies TRPCRouterRecord;
