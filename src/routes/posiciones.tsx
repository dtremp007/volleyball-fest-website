import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Users } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "~/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/posiciones")({
  component: PosicionesPage,
});

function PosicionesPage() {
  const trpc = useTRPC();

  const { data: currentSeason, isLoading: seasonLoading } = useQuery(
    trpc.season.getByState.queryOptions({ state: "active" }),
  );

  const { data: standings, isLoading: standingsLoading } = useQuery(
    trpc.matchup.getStandings.queryOptions(
      { seasonId: currentSeason?.id ?? "" },
      { enabled: !!currentSeason?.id },
    ),
  );

  const standingsByCategory = useMemo(() => {
    if (!standings) return {};
    return standings.reduce(
      (acc, row) => {
        if (!acc[row.category]) acc[row.category] = [];
        acc[row.category].push(row);
        return acc;
      },
      {} as Record<string, typeof standings>,
    );
  }, [standings]);

  const categories = Object.keys(standingsByCategory);
  const isLoading = seasonLoading || standingsLoading;

  return (
    <div className="min-h-screen">
      <section className="overflow-hidden py-16">
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mt-16 flex flex-col gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                Posiciones
              </h1>
              <p className="mt-2 text-lg text-zinc-400">
                Tabla de posiciones por sets ganados
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-6">
          {isLoading ? (
            <StandingsSkeleton />
          ) : categories.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-12">
              {categories.map((category) => (
                <div key={category}>
                  <div className="mb-6 flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{category}</h2>
                    <Badge variant="secondary">
                      {standingsByCategory[category]?.length ?? 0} equipos
                    </Badge>
                  </div>

                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>Equipo</TableHead>
                          <TableHead className="text-center">SJ</TableHead>
                          <TableHead className="text-center">SG</TableHead>
                          <TableHead className="text-center">SP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {standingsByCategory[category]?.map((team, index) => (
                          <TableRow key={team.teamId}>
                            <TableCell className="text-muted-foreground text-center font-medium">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="relative size-8 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20">
                                  {team.teamLogoUrl ? (
                                    <img
                                      src={team.teamLogoUrl}
                                      alt={team.teamName}
                                      className="size-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex size-full items-center justify-center">
                                      <Users className="size-4 text-amber-600/50" />
                                    </div>
                                  )}
                                </div>
                                <span className="font-medium">{team.teamName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{team.setsPlayed}</TableCell>
                            <TableCell className="text-center font-semibold text-green-500">
                              {team.setsWon}
                            </TableCell>
                            <TableCell className="text-center text-red-500">
                              {team.setsLost}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StandingsSkeleton() {
  return (
    <div className="space-y-12">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="mb-6 flex items-center gap-3">
            <div className="bg-muted h-8 w-48 animate-pulse rounded" />
            <div className="bg-muted h-6 w-20 animate-pulse rounded-full" />
          </div>
          <div className="overflow-hidden rounded-lg border">
            <div className="space-y-1 p-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-muted h-12 animate-pulse rounded" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-muted mb-4 flex size-16 items-center justify-center rounded-full">
        <Trophy className="text-muted-foreground size-8" />
      </div>
      <h3 className="text-lg font-semibold">No hay posiciones disponibles</h3>
      <p className="text-muted-foreground mt-1">
        Las posiciones aparecerán una vez que se registren resultados
      </p>
    </div>
  );
}
