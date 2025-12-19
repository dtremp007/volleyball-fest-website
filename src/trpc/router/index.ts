import { inferRouterOutputs } from "@trpc/server";
import { inferRouterInputs } from "@trpc/server";
import { createTRPCRouter } from "~/trpc/init";
import { categoryRouter } from "~/trpc/router/category.trpc";
import { cmsRouter } from "~/trpc/router/cms.trpc";
import { matchupRouter } from "~/trpc/router/matchup.trpc";
import { positionRouter } from "~/trpc/router/position.trpc";
import { seasonRouter } from "~/trpc/router/season.trpc";
import { teamRouter } from "~/trpc/router/team.trpc";
import { userRouter } from "~/trpc/router/user";

export const appRouter = createTRPCRouter({
  user: userRouter,
  team: teamRouter,
  category: categoryRouter,
  position: positionRouter,
  season: seasonRouter,
  matchup: matchupRouter,
  cms: cmsRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
