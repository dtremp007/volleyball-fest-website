import { tool, type InferUITools, type UIDataTypes, type UIMessage } from "ai";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  createAssistantMatchups,
  deleteUnscheduledAssistantMatchups,
  fillMissingRoundRobinMatchups,
  generateAssistantSchedule,
  getAssistantScheduleDay,
  getAssistantSeasonOverview,
  placeAssistantMatchup,
  reorderAssistantEvent,
} from "~/lib/db/queries/assistant";
import {
  createMatchupsInputSchema,
  deleteUnscheduledMatchupsInputSchema,
  generateRoundRobinInputSchema,
  generateScheduleInputSchema,
  getScheduleDayInputSchema,
  placeMatchupInputSchema,
  reorderEventInputSchema,
} from "~/validators/assistant.validators";

function toolResult<T>(execute: () => Promise<T>) {
  return async () => {
    try {
      return { ok: true as const, ...(await execute()) };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };
}

function toolResultWithInput<I, T>(execute: (input: I) => Promise<T>) {
  return async (input: I) => {
    try {
      return { ok: true as const, ...(await execute(input)) };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };
}

export function createAssistantTools(seasonId: string) {
  return {
    get_season_overview: tool({
      description:
        "Read the current season: teams, groups, pairing gaps, extra rematches, events, and matchup counts. Call this when you need fresh IDs or status.",
      inputSchema: z.object({}),
      execute: toolResult(async () => getAssistantSeasonOverview(db, seasonId)),
    }),
    get_schedule_day: tool({
      description:
        "Read one game night: court/slot placements plus the unscheduled matchup pool.",
      inputSchema: getScheduleDayInputSchema,
      execute: toolResultWithInput(async (input) =>
        getAssistantScheduleDay(db, seasonId, input.eventId),
      ),
    }),
    create_matchups: tool({
      description:
        "Add specific matchups without deleting anything. Use this for rematches or irregular pairings after a base round-robin exists.",
      inputSchema: createMatchupsInputSchema,
      execute: toolResultWithInput(async (input) =>
        createAssistantMatchups(db, seasonId, input.pairs),
      ),
    }),
    fill_missing_round_robin: tool({
      description:
        "Add only the missing round-robin meetings so each pair in a group reaches N meetings. Existing matchups stay intact. Default N is the category meetingsPerPair.",
      inputSchema: generateRoundRobinInputSchema,
      execute: toolResultWithInput(async (input) =>
        fillMissingRoundRobinMatchups(db, seasonId, input),
      ),
    }),
    generate_schedule: tool({
      description:
        "Place unscheduled matchups onto game nights using the existing algorithm. Default mode is fill (never moves existing placements). replace reshuffles all unscored placements. Optional dates create missing events only.",
      inputSchema: generateScheduleInputSchema,
      execute: toolResultWithInput(async (input) =>
        generateAssistantSchedule(db, seasonId, input),
      ),
    }),
    place_matchup: tool({
      description:
        "Move one unscored matchup to an event/court/slot, or unschedule it by setting eventId to null. Rejects scored matchups and hard conflicts.",
      inputSchema: placeMatchupInputSchema,
      execute: toolResultWithInput(async (input) =>
        placeAssistantMatchup(db, seasonId, input),
      ),
    }),
    reorder_event: tool({
      description:
        "Reassign court and slot for matchups on one game night. Scored matchups must keep their current slot. Other nights are left alone.",
      inputSchema: reorderEventInputSchema,
      execute: toolResultWithInput(async (input) =>
        reorderAssistantEvent(db, seasonId, input),
      ),
    }),
    delete_unscheduled_matchups: tool({
      description:
        "Delete specific matchups that are both unscheduled and unscored. Never deletes played or placed games.",
      inputSchema: deleteUnscheduledMatchupsInputSchema,
      execute: toolResultWithInput(async (input) =>
        deleteUnscheduledAssistantMatchups(db, seasonId, input.matchupIds),
      ),
    }),
  };
}

export type AssistantTools = ReturnType<typeof createAssistantTools>;

export type AssistantUIMessage = UIMessage<
  unknown,
  UIDataTypes,
  InferUITools<AssistantTools>
>;
