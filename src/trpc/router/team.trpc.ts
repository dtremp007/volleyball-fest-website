import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  copyTeamsToSeason,
  createTeam,
  getTeamById,
  getTeamsBySeasonId,
} from "~/lib/db/queries/team";

import { protectedProcedure, publicProcedure } from "~/trpc/init";
import { signupFormSchema } from "~/validators/signup-form.validators";

export const teamRouter = {
  list: publicProcedure
    .input(z.object({ seasonId: z.string().optional(), categoryId: z.string().optional() }))
    .query(async ({ input }) => {
      if (!input.seasonId) {
        return [];
      }

      const teams = await getTeamsBySeasonId(db, input.seasonId, input.categoryId);
      return teams;
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
} satisfies TRPCRouterRecord;

// Keep signupRouter for backwards compatibility
export const signupRouter = {
  submit: publicProcedure.input(signupFormSchema).mutation(async ({ input }) => {
    // Transform form data to match database schema
    const teamData = {
      ...input,
      unavailableDates: input.unavailableDates.join(","),
      players: input.players.map((player) => ({
        name: player.fullName,
        jerseyNumber: player.jerseyNumber,
        positionId: player.positionId,
      })),
    };
    await createTeam(db, teamData);
    return { success: true };
  }),
} satisfies TRPCRouterRecord;
