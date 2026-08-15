import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Trophy } from "lucide-react";

import { EventList } from "~/components/schedule/event-list";
import { PreviousSeasonsSection, SeasonStandings } from "~/components/standings";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/(public)/")({
  component: LandingPage,
  loader: async ({ context }) => {
    const heroContent = {
      title: "Volleyball Fest",
      subtitle: "La liga de voleibol más emocionante de Cuauhtémoc",
      ctaText: "Inscribe tu equipo",
      ctaVisible: false,
      imageUrl: "/hero.jpeg",
    };

    const { competitionSeason, registrationSeason, completedSeasons } =
      await context.queryClient.fetchQuery(
        context.trpc.season.getPublicContext.queryOptions(),
      );

    const isActiveCompetition = competitionSeason?.state === "active";

    const schedule = competitionSeason
      ? await context.queryClient.fetchQuery(
          context.trpc.matchup.getPublicUnifiedSchedule.queryOptions({
            seasonId: competitionSeason.id,
            upcomingOnly: true,
          }),
        )
      : [];

    const standings = isActiveCompetition
      ? await context.queryClient.fetchQuery(
          context.trpc.matchup.getStandings.queryOptions({
            seasonId: competitionSeason.id,
          }),
        )
      : [];

    return {
      heroContent: { ...heroContent, ctaVisible: Boolean(registrationSeason) },
      schedule,
      standings,
      activeSeasonId: isActiveCompetition ? competitionSeason.id : null,
      completedSeasons,
    };
  },
});

const heroDefaults = {
  title: "Volleyball Fest",
  subtitle: "La liga de voleibol más emocionante de Cuauhtémoc",
  ctaText: "Inscribe tu equipo",
  ctaVisible: false,
  imageUrl: "/hero.jpeg",
};

function LandingPage() {
  const { heroContent, schedule, standings, activeSeasonId, completedSeasons } =
    Route.useLoaderData();

  const hero = heroContent ?? heroDefaults;

  // Show CTA only if signup is open or signup closed (late signup allowed)
  const showCta = hero.ctaVisible;

  const hasStandings = !!standings && standings.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('${hero.imageUrl}')` }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-linear-to-b from-black/30 to-black/40" />

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

          <p className="mx-auto mb-4 max-w-2xl text-lg font-medium text-zinc-300 md:text-2xl">
            {hero.subtitle}
          </p>

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

      {/* Standings Preview Section — active season only */}
      {hasStandings && activeSeasonId ? (
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <Badge variant="secondary" className="mb-4">
                <Trophy className="mr-1 size-3" />
                Posiciones
              </Badge>
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Tabla de Posiciones
              </h2>
            </div>

            <SeasonStandings
              standings={standings}
              variant="compact"
              limitToPlayoffQualifiers
            />

            <div className="mt-8 flex justify-center">
              <Button asChild variant="outline">
                <Link to="/posiciones/$seasonId" params={{ seasonId: activeSeasonId }}>
                  Ver todas las posiciones
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {/* Schedule Section */}
      {schedule && schedule.length > 0 ? <EventList schedule={schedule} /> : null}

      <PreviousSeasonsSection seasons={completedSeasons} />

      {/* Final CTA Section */}
      {showCta ? (
        <section className="relative overflow-hidden bg-zinc-900 py-20 dark:bg-zinc-950">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-4xl px-6 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              ¿Listo para jugar?
            </h2>
            <p className="mx-auto mb-4 max-w-xl text-zinc-400">
              Inscribe a tu equipo hoy.
            </p>
            <p className="mx-auto mb-8 text-2xl font-semibold text-white">
              Costo: $3,500
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
