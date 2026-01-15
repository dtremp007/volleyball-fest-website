/// <reference types="vite/client" />

import { TanStackDevtools } from "@tanstack/react-devtools";
import { formDevtoolsPlugin } from "@tanstack/react-form-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { DefaultCatchBoundary } from "~/components/default-catch-boundary";
import { Footer } from "~/components/footer";
import { Header } from "~/components/header";
import { ThemeProvider } from "~/components/theme-provider";
import { Toaster } from "~/components/ui/sonner";
import { auth } from "~/lib/auth/auth";
import { seo } from "~/lib/utils";
import appCss from "~/styles.css?url";
import type { AppRouter } from "~/trpc/router";

const getServerSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();

  const serverSession = await auth.api.getSession({
    headers,
    query: {
      disableCookieCache: true,
    },
  });

  if (serverSession) {
    const { session, user } = serverSession;

    return {
      session,
      user,
    };
  }
});

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  trpc: TRPCOptionsProxy<AppRouter>;
}>()({
  beforeLoad: async () => {
    const session = await getServerSession();

    return { session };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#f59e0b" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      ...seo({
        title: "Volleyball Fest - Liga de Voleibol en Cuauhtémoc",
        description:
          "La liga de voleibol más emocionante de Cuauhtémoc. Inscribe tu equipo en nuestras categorías femenil y varonil. Partidos todos los sábados en el Gimnasio de Escuela Álvaro Obregón.",
        keywords:
          "voleibol, volleyball, liga, Cuauhtémoc, México, deportes, equipos, torneo",
        image: "/hero.jpeg",
      }),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.json" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SportsOrganization",
          name: "Volleyball Fest",
          description: "La liga de voleibol más emocionante de Cuauhtémoc",
          url: "https://volleyballfest.com",
          sport: "Volleyball",
          location: {
            "@type": "Place",
            name: "Gimnasio de Escuela Álvaro Obregón",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Cuauhtémoc",
              addressCountry: "MX",
            },
          },
          event: {
            "@type": "SportsEvent",
            name: "Temporada Primavera 2025",
            description: "Temporada de primavera con partidos cada sábado",
            startDate: "2025-02-01",
            endDate: "2025-05-31",
            location: {
              "@type": "Place",
              name: "Gimnasio de Escuela Álvaro Obregón",
            },
          },
        }),
      },
    ],
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    );
  },
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="font-display flex flex-col antialiased">
        <ThemeProvider>
          <Header
            links={[
              { label: "Inicio", to: "/" },
              { label: "Equipos", to: "/equipos" },
              { label: "Inscribir equipo", to: "/signup-form" },
            ]}
          />
          <main className="min-h-screen flex-1 pt-16">{children}</main>
          <Footer />
          <Toaster richColors />
        </ThemeProvider>
        <TanStackDevtools
          plugins={[
            formDevtoolsPlugin(),
            {
              name: "TanStack Query",
              render: <ReactQueryDevtoolsPanel />,
            },
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
