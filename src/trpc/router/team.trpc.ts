import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import { createTeam, getTeamById, getTeams } from "~/lib/db/queries/team";

import { publicProcedure } from "~/trpc/init";
import { signupFormSchema } from "~/validators/signup-form.validators";

export const teamRouter = {
  list: publicProcedure.query(async () => {
    const teams = await getTeams(db);
    return teams;
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const team = await getTeamById(db, input.id);
      return team ?? null;
    }),
} satisfies TRPCRouterRecord;

// Keep signupRouter for backwards compatibility
export const signupRouter = {
  submit: publicProcedure
    .input(signupFormSchema)
    .mutation(async ({ input }) => {
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
