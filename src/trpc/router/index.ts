import { createTRPCRouter } from "~/trpc/init";
import { categoryRouter } from "~/trpc/router/category.trpc";
import { positionRouter } from "~/trpc/router/position.trpc";
import { seasonRouter } from "~/trpc/router/season.trpc";
import { signupRouter, teamRouter } from "~/trpc/router/team.trpc";
import { userRouter } from "~/trpc/router/user";

export const appRouter = createTRPCRouter({
  user: userRouter,
  signupForm: signupRouter,
  team: teamRouter,
  category: categoryRouter,
  position: positionRouter,
  season: seasonRouter,
});

export type AppRouter = typeof appRouter;
