import { z } from "zod";

export const scheduleBuilderTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string(),
  category: z.string(),
  unavailableDates: z.string().optional(),
  isFarAway: z.boolean().optional(),
});

export const scheduleBuilderMatchupSchema = z.object({
  id: z.string(),
  teamA: scheduleBuilderTeamSchema,
  teamB: scheduleBuilderTeamSchema,
  category: z.string(),
});

export const scheduleBuilderCourtSchema = z.object({
  id: z.enum(["A", "B"]),
  matchups: z.array(scheduleBuilderMatchupSchema),
});

export const scheduleBuilderEventSchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  courts: z.tuple([scheduleBuilderCourtSchema, scheduleBuilderCourtSchema]),
});

export const scheduleBuilderSnapshotSchema = z.object({
  events: z.array(scheduleBuilderEventSchema),
  unscheduledMatchups: z.array(scheduleBuilderMatchupSchema),
});

/** State passed into ScheduleBuilder after the host gates on hasMatchups. */
export const scheduleBuilderInitialStateSchema = z.object({
  revision: z.string(),
  events: z.array(scheduleBuilderEventSchema),
  unscheduledMatchups: z.array(scheduleBuilderMatchupSchema),
  matchupsByCategory: z.record(z.string(), z.array(scheduleBuilderMatchupSchema)),
});

export const scheduleBuilderStateResponseSchema = z.object({
  hasMatchups: z.boolean(),
  revision: z.string(),
  events: z.array(scheduleBuilderEventSchema),
  unscheduledMatchups: z.array(scheduleBuilderMatchupSchema),
  matchupsByCategory: z.record(z.string(), z.array(scheduleBuilderMatchupSchema)),
});

export type ScheduleBuilderTeam = z.infer<typeof scheduleBuilderTeamSchema>;
export type ScheduleBuilderMatchup = z.infer<typeof scheduleBuilderMatchupSchema>;
export type ScheduleBuilderCourt = z.infer<typeof scheduleBuilderCourtSchema>;
export type ScheduleBuilderEvent = z.infer<typeof scheduleBuilderEventSchema>;
export type ScheduleBuilderSnapshot = z.infer<typeof scheduleBuilderSnapshotSchema>;
export type ScheduleBuilderInitialState = z.infer<
  typeof scheduleBuilderInitialStateSchema
>;
export type ScheduleBuilderStateResponse = z.infer<
  typeof scheduleBuilderStateResponseSchema
>;
