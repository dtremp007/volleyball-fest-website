import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, ChevronRight, MapPin } from "lucide-react";
import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle } from "~/components/ui/card";
import type { SeasonState } from "~/lib/db/schema/team.schema";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/")({
  component: LandingPage,
  loader: async ({ context }) => {
    const seasons = await context.queryClient.fetchQuery(
      context.trpc.season.getAll.queryOptions(),
    );
    const heroContent = await context.queryClient.fetchQuery(
      context.trpc.cms.getContent.queryOptions({
        key: "hero",
        defaults: heroDefaults,
      }),
    );
    const currentSeason =
      seasons.find((season) => !["completed", "draft"].includes(season.state)) ||
      seasons[0];
    const schedule = await context.queryClient.fetchQuery(
      context.trpc.matchup.getPublicSchedule.queryOptions({
        seasonId: currentSeason.id,
        upcomingOnly: true,
      }),
    );
    return { seasons, heroContent, schedule, currentSeason };
  },
});

// Default hero content for CMS
const heroDefaults = {
  title: "Volleyball Fest",
  subtitle: "La liga de voleibol más emocionante de Cuauhtémoc",
  ctaText: "Inscribe tu equipo",
  ctaVisible: true,
  imageUrl: "/hero.jpeg",
};

// Badge text based on season state
const seasonStateBadges: Record<
  SeasonState,
  { text: string; variant: "default" | "secondary" | "outline" }
> = {
  draft: { text: "Próximamente", variant: "secondary" },
  signup_open: { text: "Inscripciones Abiertas", variant: "default" },
  signup_closed: { text: "Inscripciones Cerradas", variant: "outline" },
  active: { text: "Temporada en Curso", variant: "default" },
  completed: { text: "Temporada Finalizada", variant: "secondary" },
};

// Time slots for schedule display (matching schedule builder)
const TIME_SLOTS = [
  "4:15 PM",
  "5:00 PM",
  "5:45 PM",
  "6:30 PM",
  "7:15 PM",
  "8:00 PM",
  "8:45 PM",
  "9:30 PM",
];

function LandingPage() {
  const { seasons, heroContent, schedule, currentSeason } = Route.useLoaderData();

  const hero = heroContent ?? heroDefaults;
  const seasonState = (currentSeason?.state ?? "draft") as SeasonState;
  const badgeConfig = seasonStateBadges[seasonState];

  // Show CTA only if signup is open or signup closed (late signup allowed)
  const showCta =
    hero.ctaVisible && ["signup_open", "signup_closed"].includes(seasonState);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[95vh] items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${hero.imageUrl}')` }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/50 to-black/80" />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <img
            src="/icon-no-bg-512.png"
            alt="Volleyball Fest"
            className="mx-auto size-32"
          />

          <h1 className="mb-6 text-6xl font-bold tracking-tight text-white md:text-7xl lg:text-8xl">
            {String(hero.title).includes(" ") ? (
              <>
                {String(hero.title).split(" ")[0]}
                <span className="block text-[#C20A12]">
                  {String(hero.title).split(" ").slice(1).join(" ")}
                </span>
              </>
            ) : (
              <span className="text-white">{String(hero.title)}</span>
            )}
          </h1>

          <p className="mx-auto mb-4 max-w-2xl text-lg text-zinc-300 md:text-xl">
            {hero.subtitle}
          </p>

          <div className="mb-10 flex items-center justify-center gap-2 text-zinc-400">
            <MapPin className="size-5" />
            <span className="text-sm md:text-base">
              Gimnasio de Escuela Álvaro Obregón, Cuauhtémoc, Mexico
            </span>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {showCta ? (
              <Button asChild size="lg">
                <Link to="/signup-form">
                  {String(hero.ctaText)}
                  <ChevronRight className="size-5" />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      {schedule && schedule.length > 0 ? <ScheduleSection schedule={schedule} /> : null}

      {/* Seasons Section */}
      <section className="bg-zinc-50 py-20 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <Badge variant="secondary" className="mb-4">
              <Calendar className="mr-1 size-3" />
              Calendario
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Temporadas
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl">
              Dos temporadas regulares al año más un emocionante torneo relámpago en mayo
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {seasons
              .sort(
                (a, b) =>
                  new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
              )
              .map((season, index) => (
                <Card
                  key={season.id}
                  className="group relative overflow-hidden transition-all hover:shadow-lg"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-orange-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
                  <CardHeader>
                    <div className="mb-2 flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={
                          season.id === "flash"
                            ? "border-orange-500/50 text-orange-600 dark:text-orange-400"
                            : "border-amber-500/50 text-amber-600 dark:text-amber-400"
                        }
                      >
                        {/* get months, if in the same month, then just show that month */}
                        {new Date(season.startDate).getMonth() ===
                        new Date(season.endDate).getMonth() ? (
                          new Date(season.startDate).toLocaleDateString("es-MX", {
                            month: "long",
                          })
                        ) : (
                          <>
                            {new Date(season.startDate).toLocaleDateString("es-MX", {
                              month: "long",
                            })}{" "}
                            -{" "}
                            {new Date(season.endDate).toLocaleDateString("es-MX", {
                              month: "long",
                            })}
                          </>
                        )}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{season.name}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      {showCta ? (
        <section className="relative overflow-hidden bg-zinc-900 py-20 dark:bg-zinc-950">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-4xl px-6 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              ¿Listo para jugar?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-zinc-400">
              Inscribe a tu equipo hoy y forma parte de la comunidad de voleibol más
              activa de Cuauhtémoc
            </p>
            <Button asChild size="lg">
              <Link to="/signup-form">
                Inscribe tu equipo ahora
                <ChevronRight className="size-5" />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

// Schedule Section Component
type ScheduleEvent = {
  id: string;
  name: string;
  date: string;
  matchups: {
    id: string;
    teamA: { name: string; logoUrl: string };
    teamB: { name: string; logoUrl: string };
    category: string;
    courtId: string | null;
    slotIndex: number | null;
  }[];
};

function ScheduleSection({ schedule }: { schedule: ScheduleEvent[] }) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(
    () => new Set(schedule.slice(0, 2).map((e) => e.id)),
  );

  const toggleEvent = (id: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section id="schedule" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-4">
            <Calendar className="mr-1 size-3" />
            Calendario
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Calendario de Partidos
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl">
            Todas las jornadas programadas para esta temporada
          </p>
        </div>

        <div className="space-y-4">
          {schedule.map((event) => {
            const isExpanded = expandedEvents.has(event.id);
            const isPast = new Date(event.date + "T00:00:00") < new Date("T00:00:00");

            // Group matchups by time slot for table display
            const matchupsBySlot = new Map<
              number,
              {
                court1?: (typeof event.matchups)[number];
                court2?: (typeof event.matchups)[number];
              }
            >();
            for (const matchup of event.matchups) {
              if (matchup.slotIndex !== null) {
                const slot = matchupsBySlot.get(matchup.slotIndex) ?? {};
                if (matchup.courtId === "A") {
                  slot.court1 = matchup;
                } else if (matchup.courtId === "B") {
                  slot.court2 = matchup;
                }
                matchupsBySlot.set(matchup.slotIndex, slot);
              }
            }
            // Get sorted slot indices
            const sortedSlots = Array.from(matchupsBySlot.keys()).sort((a, b) => a - b);

            return (
              <Card
                key={event.id}
                className={`overflow-hidden transition-all ${isPast ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="flex size-12 flex-col items-center justify-center rounded-lg bg-amber-500/10">
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      {new Date(event.date + "T00:00:00")
                        .toLocaleDateString("es-MX", { month: "short" })
                        .toUpperCase()}
                    </span>
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {new Date(event.date + "T00:00:00").getDate()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      {formatDate(event.date + "T00:00:00")}
                    </h3>
                  </div>
                </div>

                {event.matchups.length > 0 && (
                  <div className="bg-muted/20 border-t">
                    {/* Desktop Schedule Table */}
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/30 border-b">
                            <th className="text-muted-foreground w-24 px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                              Hora
                            </th>
                            <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                              Cancha 1
                            </th>
                            <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                              Cancha 2
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedSlots.map((slotIndex, idx) => {
                            const slot = matchupsBySlot.get(slotIndex)!;
                            return (
                              <tr
                                key={slotIndex}
                                className={
                                  idx !== sortedSlots.length - 1
                                    ? "border-muted/50 border-b"
                                    : ""
                                }
                              >
                                <td className="px-4 py-3">
                                  <span className="text-muted-foreground text-sm font-medium">
                                    {TIME_SLOTS[slotIndex]}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {slot.court1 ? (
                                    <MatchupCell matchup={slot.court1} />
                                  ) : (
                                    <span className="text-muted-foreground/50 text-sm">
                                      —
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {slot.court2 ? (
                                    <MatchupCell matchup={slot.court2} />
                                  ) : (
                                    <span className="text-muted-foreground/50 text-sm">
                                      —
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Schedule - Stacked Courts */}
                    <div className="space-y-4 p-4 md:hidden">
                      {sortedSlots.map((slotIndex) => {
                        const slot = matchupsBySlot.get(slotIndex)!;
                        return (
                          <div key={slotIndex} className="space-y-3">
                            <div className="text-muted-foreground flex items-center gap-2 text-sm font-semibold">
                              <Calendar className="size-4" />
                              {TIME_SLOTS[slotIndex]}
                            </div>

                            {slot.court1 && (
                              <div className="space-y-1.5">
                                <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                                  Cancha 1
                                </div>
                                <MatchupCell matchup={slot.court1} />
                              </div>
                            )}

                            {slot.court2 && (
                              <div className="space-y-1.5">
                                <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                                  Cancha 2
                                </div>
                                <MatchupCell matchup={slot.court2} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MatchupCell({ matchup }: { matchup: ScheduleEvent["matchups"][number] }) {
  return (
    <div className="bg-background flex flex-col gap-2 rounded-lg p-2.5 shadow-sm">
      {/* Category Badge - Above teams */}
      <Badge variant="outline" className="w-fit text-xs">
        {matchup.category}
      </Badge>

      {/* Teams - Full width */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <TeamBadge name={matchup.teamA.name} logoUrl={matchup.teamA.logoUrl} />
        <span className="text-muted-foreground hidden text-xs font-medium sm:inline">
          vs
        </span>
        <TeamBadge name={matchup.teamB.name} logoUrl={matchup.teamB.logoUrl} />
      </div>
    </div>
  );
}

function TeamBadge({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-1.5", className)}>
      <div className="bg-muted size-6 shrink-0 overflow-hidden rounded">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="size-full object-cover" />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center text-xs">
            {name[0]}
          </div>
        )}
      </div>
      <span className="truncate text-sm font-medium">{name}</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
