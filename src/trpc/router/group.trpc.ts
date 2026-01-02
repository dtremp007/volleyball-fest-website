import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { db } from "~/lib/db";
import {
  assignTeamToGroup,
  createGroup,
  deleteGroup,
  getGroupsBySeasonAndCategory,
  getTeamsByGroup,
} from "~/lib/db/queries/group";
import { protectedProcedure } from "~/trpc/init";

export const groupRouter = {
  /**
   * List all groups for a season and category
   */
  list: protectedProcedure
    .input(
      z.object({
        seasonId: z.string(),
        categoryId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await getGroupsBySeasonAndCategory(db, input.seasonId, input.categoryId);
    }),

  /**
   * Create a new group for a season and category
   */
  create: protectedProcedure
    .input(
      z.object({
        seasonId: z.string(),
        categoryId: z.string(),
        name: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return await createGroup(db, input);
    }),

  /**
   * Assign a team to a group (or remove from group if groupId is null)
   */
  assignTeam: protectedProcedure
    .input(
      z.object({
        seasonId: z.string(),
        teamId: z.string(),
        groupId: z.string().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      await assignTeamToGroup(db, input.seasonId, input.teamId, input.groupId);
      return { success: true };
    }),

  /**
   * Get all teams in a specific group
   */
  getTeams: protectedProcedure
    .input(
      z.object({
        seasonId: z.string(),
        groupId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      return await getTeamsByGroup(db, input.seasonId, input.groupId);
    }),

  /**
   * Delete a group and remove all team assignments
   */
  delete: protectedProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ input }) => {
      await deleteGroup(db, input.groupId);
      return { success: true };
    }),
} satisfies TRPCRouterRecord;
