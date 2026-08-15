import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Users } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/(public)/equipos/$teamId")({
  component: EquipoDetailPage,
  loader: async ({ context, params }) => {
    const publicContext = await context.queryClient.ensureQueryData(
      context.trpc.season.getPublicContext.queryOptions(),
    );

    const seasonId = publicContext.teamsSeason?.id;
    if (seasonId) {
      await context.queryClient.ensureQueryData(
        context.trpc.team.getPublicById.queryOptions({
          seasonId,
          teamId: params.teamId,
        }),
      );
    }

    return { publicContext };
  },
});

function EquipoDetailPage() {
  const { teamId } = Route.useParams();
  const { publicContext } = Route.useLoaderData();
  const trpc = useTRPC();
  const seasonId = publicContext.teamsSeason?.id ?? "";

  const { data: team, isLoading } = useQuery(
    trpc.team.getPublicById.queryOptions({ seasonId, teamId }, { enabled: !!seasonId }),
  );

  if (isLoading) {
    return <TeamDetailSkeleton />;
  }

  if (!seasonId || !team) {
    return (
      <div className="min-h-screen">
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <Button asChild variant="ghost" className="mb-8 gap-2 text-zinc-400">
              <Link to="/equipos">
                <ArrowLeft className="size-4" />
                Volver a equipos
              </Link>
            </Button>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-muted mb-4 flex size-16 items-center justify-center rounded-full">
                <Users className="text-muted-foreground size-8" />
              </div>
              <h1 className="text-2xl font-semibold">Equipo no encontrado</h1>
              <p className="text-muted-foreground mt-2">
                Este equipo no está registrado en la temporada actual
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/equipos">Volver a equipos</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const sortedPlayers = [...team.players].sort(
    (a, b) => parseInt(a.jerseyNumber) - parseInt(b.jerseyNumber),
  );

  return (
    <div className="min-h-screen">
      <section className="overflow-hidden py-16">
        <div className="relative mx-auto max-w-6xl px-6">
          <Button asChild variant="ghost" className="mb-8 gap-2 text-zinc-400">
            <Link to="/equipos">
              <ArrowLeft className="size-4" />
              Volver a equipos
            </Link>
          </Button>

          <div className="mt-4 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20">
              {team.logoUrl ? (
                <img
                  src={team.logoUrl}
                  alt={team.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <Users className="size-12 text-amber-600/50" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                {team.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Badge variant="secondary">{team.category}</Badge>
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <Users className="size-4" />
                  {team.players.length} jugadores
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <Card>
            <CardHeader>
              <CardTitle>Plantel</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedPlayers.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-sm font-semibold text-amber-600 dark:text-amber-400">
                        {player.jerseyNumber}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{player.name}</p>
                        {player.position && (
                          <p className="text-muted-foreground text-sm">
                            {player.position}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No hay jugadores registrados
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function TeamDetailSkeleton() {
  return (
    <div className="min-h-screen">
      <section className="overflow-hidden py-16">
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="bg-muted mb-8 h-9 w-40 animate-pulse rounded" />
          <div className="mt-4 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="bg-muted size-24 animate-pulse rounded-2xl" />
            <div className="space-y-3">
              <div className="bg-muted h-10 w-64 animate-pulse rounded" />
              <div className="bg-muted h-6 w-40 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </section>
      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <Card>
            <CardHeader>
              <div className="bg-muted h-6 w-24 animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {["a", "b", "c", "d", "e", "f"].map((id) => (
                  <div key={id} className="bg-muted h-16 animate-pulse rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
