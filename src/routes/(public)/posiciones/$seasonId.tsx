import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import {
  SeasonStandings,
  SeasonStandingsPicker,
  StandingsEmpty,
  StandingsSkeleton,
} from "~/components/standings";
import {
  getPosicionesSeasonOptions,
  selectDefaultPosicionesSeasonId,
} from "~/lib/public-standings-seasons";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/(public)/posiciones/$seasonId")({
  component: PosicionesSeasonPage,
  loader: async ({ context, params }) => {
    const publicContext = await context.queryClient.ensureQueryData(
      context.trpc.season.getPublicContext.queryOptions(),
    );

    const options = getPosicionesSeasonOptions(publicContext);
    const isValidSeason = options.some((season) => season.id === params.seasonId);

    if (!isValidSeason) {
      const fallbackId = selectDefaultPosicionesSeasonId(publicContext);
      if (fallbackId) {
        throw redirect({
          to: "/posiciones/$seasonId",
          params: { seasonId: fallbackId },
        });
      }
      throw redirect({ to: "/posiciones" });
    }

    await context.queryClient.ensureQueryData(
      context.trpc.matchup.getStandings.queryOptions({
        seasonId: params.seasonId,
      }),
    );

    return { publicContext };
  },
});

function PosicionesSeasonPage() {
  const { seasonId } = Route.useParams();
  const { publicContext } = Route.useLoaderData();
  const trpc = useTRPC();

  const seasonOptions = getPosicionesSeasonOptions(publicContext);
  const selectedSeason = seasonOptions.find((season) => season.id === seasonId);

  const { data: standings, isLoading } = useQuery(
    trpc.matchup.getStandings.queryOptions({ seasonId }),
  );

  const hasStandings = !!standings && standings.length > 0;

  return (
    <div className="min-h-screen">
      <section className="mt-10 overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                Posiciones
              </h1>
              <p className="mt-2 text-lg text-zinc-400">
                {selectedSeason
                  ? selectedSeason.name
                  : "Tabla de posiciones por partidos ganados"}
              </p>
            </div>

            <SeasonStandingsPicker seasons={seasonOptions} selectedSeasonId={seasonId} />
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-6">
          {isLoading ? (
            <StandingsSkeleton variant="full" />
          ) : !hasStandings ? (
            <StandingsEmpty />
          ) : (
            <SeasonStandings standings={standings} variant="full" />
          )}
        </div>
      </section>
    </div>
  );
}
