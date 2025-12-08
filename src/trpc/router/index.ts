import { createTRPCRouter } from "~/trpc/init";
import { userRouter } from "~/trpc/router/user";
import { signupRouter } from "~/trpc/router/signup";

export const appRouter = createTRPCRouter({
  user: userRouter,
  signup: signupRouter,
});

export type AppRouter = typeof appRouter;
