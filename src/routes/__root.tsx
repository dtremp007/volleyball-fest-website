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

import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

import { DefaultCatchBoundary } from "~/components/default-catch-boundary";
import { ThemeProvider } from "~/components/theme-provider";
import { Separator } from "~/components/ui/separator";
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

function Footer() {
  return (
    <footer className="border-t bg-zinc-50 dark:bg-zinc-900/50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">
              Volleyball{" "}
              <span className="bg-linear-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                Fest
              </span>
            </h3>
            <div className="text-muted-foreground flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-amber-500" />
              <span>
                Gimnasio de Escuela Álvaro Obregón
                <br />
                Cuauhtémoc, Mexico
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold">Enlaces</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link
                to="/"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Inicio
              </Link>
              <a
                href="/equipos"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Equipos
              </a>
              <Link
                to="/signup-form"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Inscribir equipo
              </Link>
            </nav>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <h4 className="font-semibold">Temporadas</h4>
            <div className="text-muted-foreground flex flex-col gap-2 text-sm">
              <span>Primavera: Febrero - Mayo</span>
              <span>Otoño: Septiembre - Diciembre</span>
              <span>Torneo Relámpago: Mayo</span>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="text-muted-foreground flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
          <p>
            © {new Date().getFullYear()} Volleyball Fest. Todos los derechos reservados.
          </p>
          <p>Hecho con pasión por el voleibol</p>
        </div>
      </div>
    </footer>
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
          <main className="flex-1 min-h-screen">{children}</main>
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
