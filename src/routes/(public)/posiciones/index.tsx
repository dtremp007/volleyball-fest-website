import { createFileRoute, redirect } from "@tanstack/react-router";

import { StandingsEmpty } from "~/components/standings";
import { selectDefaultPosicionesSeasonId } from "~/lib/public-standings-seasons";

export const Route = createFileRoute("/(public)/posiciones/")({
  component: PosicionesIndexPage,
  loader: async ({ context }) => {
    const publicContext = await context.queryClient.ensureQueryData(
      context.trpc.season.getPublicContext.queryOptions(),
    );

    const seasonId = selectDefaultPosicionesSeasonId(publicContext);
    if (seasonId) {
      throw redirect({
        to: "/posiciones/$seasonId",
        params: { seasonId },
      });
    }

    return null;
  },
});

function PosicionesIndexPage() {
  return (
    <div className="min-h-screen">
      <section className="mt-10 overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                Posiciones
              </h1>
              <p className="mt-2 text-lg text-zinc-400">
                Tabla de posiciones por partidos ganados
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-6">
          <StandingsEmpty />
        </div>
      </section>
    </div>
  );
}
