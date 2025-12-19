import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  createSeason,
  deleteSeason,
  getSeasonById,
  getSeasonByState,
  getSeasons,
  updateSeason,
  updateSeasonState,
} from "~/lib/db/queries/season";
import { protectedProcedure, publicProcedure } from "~/trpc/init";
import {
  createSeasonSchema,
  seasonStateEnum,
  updateSeasonSchema,
} from "~/validators/season.validators";

// Valid state transitions: defines which states can transition to which
const validStateTransitions: Record<string, string[]> = {
  draft: ["signup_open"],
  signup_open: ["signup_closed", "active"],
  signup_closed: ["signup_open", "active"],
  active: ["completed"],
  completed: [], // Terminal state
};

export const seasonRouter = {
  getAll: protectedProcedure.query(async () => {
    return await getSeasons(db);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getSeasonById(db, input.id);
    }),

  getByState: publicProcedure.input(z.object({ state: seasonStateEnum })).query(async ({ input }) => {
    return await getSeasonByState(db, input.state);
  }),

  create: protectedProcedure
    .input(createSeasonSchema)
    .mutation(async ({ input }) => {
      return await createSeason(db, input);
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), data: updateSeasonSchema }))
    .mutation(async ({ input }) => {
      return await updateSeason(db, input.id, input.data);
    }),

  updateState: protectedProcedure
    .input(z.object({ id: z.string(), state: seasonStateEnum }))
    .mutation(async ({ input }) => {
      // Get current season to validate transition
      const currentSeason = await getSeasonById(db, input.id);

      if (!currentSeason) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Season not found",
        });
      }

      const currentState = currentSeason.state ?? "draft";
      const allowedTransitions = validStateTransitions[currentState] ?? [];

      if (!allowedTransitions.includes(input.state)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from '${currentState}' to '${input.state}'. Allowed transitions: ${allowedTransitions.join(", ") || "none"}`,
        });
      }

      return await updateSeasonState(db, input.id, input.state);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await deleteSeason(db, input.id);
    }),
} satisfies TRPCRouterRecord;
