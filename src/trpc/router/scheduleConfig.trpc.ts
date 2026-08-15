import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import { getScheduleConfig, upsertScheduleConfig } from "~/lib/db/queries/schedule";
import {
  createSchedulePreset,
  deleteSchedulePreset,
  getActiveSchedulePreset,
  getSchedulePresets,
  setActiveSchedulePreset,
} from "~/lib/db/queries/schedule-preset";
import { protectedProcedure } from "~/trpc/init";
import {
  DEFAULT_SCHEDULING_WEIGHTS,
  parseSchedulePresetWeights,
  saveSchedulePresetSchema,
  type SchedulingWeights,
} from "~/validators/scheduling.validators";

function withParsedWeights<T extends { weightsJson: string }>(
  preset: T,
): T & { weights: SchedulingWeights } {
  try {
    return { ...preset, weights: parseSchedulePresetWeights(preset.weightsJson) };
  } catch {
    return { ...preset, weights: DEFAULT_SCHEDULING_WEIGHTS };
  }
}

function mapActivePresetError(error: unknown): never {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message:
      error instanceof Error
        ? error.message
        : "Could not set the active schedule preset. Create schedule config first.",
  });
}

export const scheduleConfigRouter = {
  /**
   * Get schedule config for a season
   */
  get: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .query(async ({ input }) => {
      return await getScheduleConfig(db, input.seasonId);
    }),

  /**
   * Create or update schedule config for a season
   */
  upsert: protectedProcedure
    .input(
      z.object({
        seasonId: z.string(),
        defaultStartTime: z.string(), // e.g., "4:15 PM"
        gamesPerEvening: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      return await upsertScheduleConfig(db, input);
    }),

  listPresets: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .query(async ({ input }) => {
      const presets = await getSchedulePresets(db, input.seasonId);
      return presets.map(withParsedWeights);
    }),

  savePreset: protectedProcedure
    .input(saveSchedulePresetSchema)
    .mutation(async ({ input }) => {
      const preset = await createSchedulePreset(db, {
        seasonId: input.seasonId,
        name: input.name,
        weightsJson: JSON.stringify(input.weights),
      });

      if (input.setActive) {
        try {
          await setActiveSchedulePreset(db, input.seasonId, preset.id);
        } catch (error) {
          mapActivePresetError(error);
        }
      }

      return withParsedWeights(preset);
    }),

  deletePreset: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await deleteSchedulePreset(db, input.id);
    }),

  setActivePreset: protectedProcedure
    .input(z.object({ seasonId: z.string(), presetId: z.string().nullable() }))
    .mutation(async ({ input }) => {
      try {
        return await setActiveSchedulePreset(db, input.seasonId, input.presetId);
      } catch (error) {
        mapActivePresetError(error);
      }
    }),

  getActivePreset: protectedProcedure
    .input(z.object({ seasonId: z.string() }))
    .query(async ({ input }) => {
      const preset = await getActiveSchedulePreset(db, input.seasonId);
      return preset ? withParsedWeights(preset) : null;
    }),
} satisfies TRPCRouterRecord;
