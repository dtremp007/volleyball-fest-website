import { z } from "zod";
import { meetingsPerPairSchema } from "~/validators/category.validators";
import { partialSchedulingWeightsSchema } from "~/validators/scheduling.validators";

export const assistantCourtSchema = z.enum(["A", "B"]);

export const createMatchupPairSchema = z.object({
  teamAId: z.string().min(1),
  teamBId: z.string().min(1),
  count: z.number().int().min(1).max(3).default(1),
});

export const createMatchupsInputSchema = z.object({
  pairs: z.array(createMatchupPairSchema).min(1).max(50),
});

export const generateRoundRobinInputSchema = z.object({
  meetingsPerPair: meetingsPerPairSchema.optional(),
  groupId: z.string().min(1).optional(),
});

export const generateScheduleInputSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  mode: z.enum(["fill", "replace"]).default("fill"),
  weights: partialSchedulingWeightsSchema.optional(),
});

export const placeMatchupInputSchema = z.object({
  matchupId: z.string().min(1),
  eventId: z.string().min(1).nullable(),
  courtId: assistantCourtSchema.optional(),
  slotIndex: z.number().int().min(0).max(15).optional(),
});

export const reorderEventInputSchema = z.object({
  eventId: z.string().min(1),
  placements: z
    .array(
      z.object({
        matchupId: z.string().min(1),
        courtId: assistantCourtSchema,
        slotIndex: z.number().int().min(0).max(15),
      }),
    )
    .min(1)
    .max(40),
});

export const deleteUnscheduledMatchupsInputSchema = z.object({
  matchupIds: z.array(z.string().min(1)).min(1).max(100),
});

export const getScheduleDayInputSchema = z.object({
  eventId: z.string().min(1),
});
