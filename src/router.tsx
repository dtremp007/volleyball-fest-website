// https://tanstack.com/router/latest/docs/framework/react/start/getting-started#the-root-of-your-application

import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import {
  createTRPCClient,
  httpBatchStreamLink,
  loggerLink,
  type TRPCClient,
} from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";
import { DefaultCatchBoundary } from "~/components/default-catch-boundary";
import { DefaultNotFound } from "~/components/default-not-found";
import { getUrl } from "~/lib/utils";
import { createServerTrpc } from "~/trpc/create-server-trpc.server";
import {
  PUBLIC_CONTEXT_STALE_TIME,
  REFERENCE_DATA_STALE_TIME,
} from "~/trpc/query-stale-times";
import { TRPCProvider } from "~/trpc/react";
import type { AppRouter } from "~/trpc/router";
import { routeTree } from "./routeTree.gen";

const getHeaders = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequestHeaders } = await import("@tanstack/react-start/server");
  const headers = getRequestHeaders();

  return Object.fromEntries(headers);
});

/** SSR uses in-process procedures; browser uses HTTP. */
const createAppTrpc = createIsomorphicFn()
  .server((queryClient: QueryClient, _trpcClient: TRPCClient<AppRouter>) => {
    return createServerTrpc(queryClient);
  })
  .client((queryClient: QueryClient, trpcClient: TRPCClient<AppRouter>) => {
    return createTRPCOptionsProxy<AppRouter>({
      queryClient,
      client: trpcClient,
    });
  });

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30 * 1000 },
      dehydrate: { serializeData: superjson.serialize },
      hydrate: { deserializeData: superjson.deserialize },
    },
  });

  const trpcClient = createTRPCClient<AppRouter>({
    links: [
      loggerLink({
        enabled: (op) =>
          process.env.NODE_ENV === "development" ||
          (op.direction === "down" && op.result instanceof Error),
      }),
      httpBatchStreamLink({
        transformer: superjson,
        url: getUrl(),
        async headers() {
          return await getHeaders();
        },
      }),
    ],
  });

  const trpc = createAppTrpc(queryClient, trpcClient);

  queryClient.setQueryDefaults(trpc.category.getAll.queryKey(), {
    staleTime: REFERENCE_DATA_STALE_TIME,
  });
  queryClient.setQueryDefaults(trpc.position.getAll.queryKey(), {
    staleTime: REFERENCE_DATA_STALE_TIME,
  });
  queryClient.setQueryDefaults(trpc.season.getPublicContext.queryKey(), {
    staleTime: PUBLIC_CONTEXT_STALE_TIME,
  });

  const router = createRouter({
    context: { queryClient, trpc },
    routeTree,
    defaultPreload: "intent",
    defaultPendingMs: 120,
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <DefaultNotFound />,
    scrollRestoration: true,
    Wrap: (props: { children: React.ReactNode }) => {
      return (
        <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
          {props.children}
        </TRPCProvider>
      );
    },
  });
  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
