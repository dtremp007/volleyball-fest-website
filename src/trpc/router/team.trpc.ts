import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import { getPublicSeasonContext } from "~/lib/db/queries/season";
import {
  copyTeamsToSeason,
  createTeamRegistration,
  getPublicTeamsBySeasonId,
  getTeamForSeason,
  getTeamsBySeasonId,
  removeTeamFromSeason,
  updateTeamForSeason,
  updateTeamIsFarAway,
} from "~/lib/db/queries/team";
import { normalizeUnavailableDates } from "~/lib/unavailable-dates";
import { protectedProcedure, publicProcedure } from "~/trpc/init";
import {
  adminTeamUpdateSchema,
  signupFormSchema,
} from "~/validators/signup-form.validators";

function normalizeTeamInput<
  T extends { unavailableDates: string[]; comingFrom?: string },
>(input: T) {
  return {
    ...input,
    unavailableDates: normalizeUnavailableDates(input.unavailableDates),
    comingFrom: input.comingFrom ?? "",
  };
}

export const teamRouter = {
  list: protectedProcedure
    .input(z.object({ seasonId: z.string(), categoryId: z.string().optional() }))
    .query(async ({ input }) => {
      return await getTeamsBySeasonId(db, input.seasonId, input.categoryId);
    }),

  listPublic: publicProcedure
    .input(z.object({ seasonId: z.string() }))
    .query(async ({ input }) => {
      return await getPublicTeamsBySeasonId(db, input.seasonId);
    }),

  getForSeason: protectedProcedure
    .input(z.object({ seasonId: z.string(), teamId: z.string() }))
    .query(async ({ input }) => {
      return await getTeamForSeason(db, input.seasonId, input.teamId);
    }),

  register: publicProcedure.input(signupFormSchema).mutation(async ({ input }) => {
    const { registrationSeason } = await getPublicSeasonContext(db);
    if (!registrationSeason) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Team registration is currently closed.",
      });
    }

    const { acceptTerms: _acceptTerms, acceptCost: _acceptCost, ...details } = input;
    void _acceptTerms;
    void _acceptCost;
    const result = await createTeamRegistration(
      db,
      registrationSeason.id,
      normalizeTeamInput(details),
    );
    return { success: true, ...result };
  }),

  updateForSeason: protectedProcedure
    .input(
      z.object({
        seasonId: z.string(),
        teamId: z.string(),
        data: adminTeamUpdateSchema,
      }),
    )
    .mutation(async ({ input }) => {
      await updateTeamForSeason(
        db,
        input.seasonId,
        input.teamId,
        normalizeTeamInput(input.data),
      );
      return { success: true };
    }),

  copyToSeason: protectedProcedure
    .input(
      z.object({
        sourceSeasonId: z.string(),
        targetSeasonId: z.string(),
        teamIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      return await copyTeamsToSeason(
        db,
        input.sourceSeasonId,
        input.targetSeasonId,
        input.teamIds,
      );
    }),

  removeFromSeason: protectedProcedure
    .input(z.object({ seasonId: z.string(), teamId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        return await removeTeamFromSeason(db, input.seasonId, input.teamId);
      } catch (error) {
        throw new TRPCError({
          code: "CONFLICT",
          message: error instanceof Error ? error.message : "Team could not be removed.",
        });
      }
    }),

  updateIsFarAway: protectedProcedure
    .input(z.object({ seasonId: z.string(), teamId: z.string(), isFarAway: z.boolean() }))
    .mutation(async ({ input }) => {
      await updateTeamIsFarAway(db, input.seasonId, input.teamId, input.isFarAway);
      return { success: true };
    }),
} satisfies TRPCRouterRecord;
