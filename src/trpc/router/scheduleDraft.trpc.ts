import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  applyScheduleDraft,
  clearScheduleDrafts,
  deleteScheduleDraft,
  generateScheduleCandidates,
  getScheduleDrafts,
  toScheduleDraftView,
} from "~/lib/db/queries/schedule-draft";
import { protectedProcedure } from "~/trpc/init";
import { generateScheduleCandidatesSchema } from "~/validators/scheduling.validators";

function mapDraftError(error: unknown, fallback: string): never {
  const message = error instanceof Error ? error.message : fallback;
  if (message === "Schedule draft not found") {
    throw new TRPCError({ code: "NOT_FOUND", message });
  }
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

export const scheduleDraftRouter = {
  generateCandidates: protectedProcedure
    .input(generateScheduleCandidatesSchema)
    .mutation(async ({ input }) => {
      try {
        return await generateScheduleCandidates(db, input);
      } catch (error) {
        mapDraftError(error, "Could not generate schedule candidates");
      }
    }),

  list: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .query(async ({ input }) => {
      const drafts = await getScheduleDrafts(db, input.seasonId);
      return drafts.map(toScheduleDraftView);
    }),

  apply: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        return await applyScheduleDraft(db, input.id);
      } catch (error) {
        mapDraftError(error, "Could not apply schedule draft");
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const draft = await deleteScheduleDraft(db, input.id);
      if (!draft) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Schedule draft not found",
        });
      }
      return draft;
    }),

  clear: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .mutation(async ({ input }) => {
      return await clearScheduleDrafts(db, input.seasonId);
    }),
} satisfies TRPCRouterRecord;
