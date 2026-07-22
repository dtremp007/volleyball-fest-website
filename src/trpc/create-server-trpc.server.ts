import "@tanstack/react-start/server-only";

import type { QueryClient } from "@tanstack/react-query";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { createTRPCContext } from "~/trpc/init";
import { appRouter, type AppRouter } from "~/trpc/router";

/** In-process tRPC proxy for SSR loaders — no self-HTTP round-trip. */
export function createServerTrpc(queryClient: QueryClient) {
  return createTRPCOptionsProxy<AppRouter>({
    queryClient,
    router: appRouter,
    ctx: () => createTRPCContext({ headers: getRequestHeaders() }),
  });
}
