import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

import { auth } from "~/lib/auth/auth";
import { parseUserRole } from "~/lib/auth/roles";
import { db } from "~/lib/db";
import { rulesForRole } from "~/lib/permix/permissions";
import { permix } from "~/lib/permix/trpc";

function getRequestHeaders(opts: { headers: Headers } | Request) {
  return opts instanceof Request ? opts.headers : opts.headers;
}

export const createTRPCContext = async (opts: { headers: Headers } | Request) => {
  const headers = getRequestHeaders(opts);
  const session = await auth.api.getSession({
    headers,
    query: {
      disableCookieCache: true,
    },
  });

  return {
    db,
    headers,
    session,
  };
};

export const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;

const enforceUserIsAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const role = parseUserRole(
    "role" in ctx.session.user ? ctx.session.user.role : undefined,
  );

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
      ...permix.setupContext(rulesForRole(role)),
    },
  });
});

export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthenticated);
export { permix };
