import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/equipos")({
  component: EquiposPage,
});

function EquiposPage() {
  const trpc = useTRPC();
  const [search, setSearch] = useState("");

  // Get current season
  const { data: currentSeason, isLoading: seasonLoading } = useQuery(
    trpc.season.getByState.queryOptions({ state: "active" }),
  );

  // Get teams with players
  const { data: teams, isLoading: teamsLoading } = useQuery(
    trpc.team.listPublic.queryOptions(
      { seasonId: currentSeason?.id ?? "" },
      { enabled: !!currentSeason?.id },
    ),
  );

  // Group teams by category
  const teamsByCategory = useMemo(() => {
    if (!teams) return {};
    return teams.reduce(
      (acc, team) => {
        const cat = team.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(team);
        return acc;
      },
      {} as Record<string, typeof teams>,
    );
  }, [teams]);

  // Filter teams by search
  const filteredTeamsByCategory = useMemo(() => {
    if (!search.trim()) return teamsByCategory;

    const searchLower = search.toLowerCase();
    const filtered: Record<string, typeof teams> = {};

    for (const [category, categoryTeams] of Object.entries(teamsByCategory)) {
      const matchingTeams = categoryTeams!.filter(
        (team) =>
          team.name.toLowerCase().includes(searchLower) ||
          team.players.some((p) => p.name.toLowerCase().includes(searchLower)),
      );
      if (matchingTeams.length > 0) {
        filtered[category] = matchingTeams;
      }
    }

    return filtered;
  }, [teamsByCategory, search]);

  const categories = Object.keys(filteredTeamsByCategory);
  const isLoading = seasonLoading || teamsLoading;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="overflow-hidden py-16">
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mt-16 flex flex-col gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                Equipos
              </h1>
              <p className="mt-2 text-lg text-zinc-400">
                Conoce a todos los equipos participantes y sus jugadores
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                type="search"
                placeholder="Buscar equipo o jugador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-zinc-700 bg-zinc-800/50 pl-10 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Teams Content */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-6">
          {isLoading ? (
            <TeamsSkeleton />
          ) : categories.length === 0 ? (
            <EmptyState search={search} />
          ) : (
            <div className="space-y-12">
              {categories.map((category) => (
                <div key={category}>
                  {/* Category Header */}
                  <div className="mb-6 flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{category}</h2>
                    <Badge variant="secondary">
                      {filteredTeamsByCategory[category]?.length ?? 0} equipos
                    </Badge>
                  </div>

                  {/* Teams Grid */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {filteredTeamsByCategory[category]?.map((team) => (
                      <TeamCard key={team.id} team={team} />
                    ))}
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

type Team = {
  id: string;
  name: string;
  logoUrl: string;
  category: string;
  players: {
    id: string;
    name: string;
    jerseyNumber: string;
    position: string | null;
  }[];
};

function TeamCard({ team }: { team: Team }) {
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          {/* Team Logo */}
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Users className="size-8 text-amber-600/50" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-xl">{team.name}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-2">
              <Users className="size-3.5" />
              {team.players.length} jugadores
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Roster */}
        <div className="space-y-2">
          <h4 className="text-muted-foreground text-sm font-medium">Plantel</h4>
          {team.players.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {team.players
                .sort((a, b) => parseInt(a.jerseyNumber) - parseInt(b.jerseyNumber))
                .map((player) => (
                  <div key={player.id} className="flex items-center gap-2 text-sm">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded bg-amber-500/10 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {player.jerseyNumber}
                    </span>
                    <span className="truncate">{player.name}</span>
                    {player.position && (
                      <span className="text-muted-foreground text-xs">
                        ({player.position})
                      </span>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No hay jugadores registrados</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamsSkeleton() {
  return (
    <div className="space-y-12">
      {[1, 2].map((section) => (
        <div key={section}>
          {/* Category header skeleton */}
          <div className="mb-6 flex items-center gap-3">
            <div className="bg-muted h-8 w-48 animate-pulse rounded" />
            <div className="bg-muted h-6 w-20 animate-pulse rounded-full" />
          </div>

          {/* Cards skeleton */}
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted size-16 animate-pulse rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="bg-muted h-6 w-32 animate-pulse rounded" />
                      <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="bg-muted h-4 w-16 animate-pulse rounded" />
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((j) => (
                        <div key={j} className="bg-muted h-6 animate-pulse rounded" />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="bg-muted mb-4 flex size-16 items-center justify-center rounded-full">
        <Users className="text-muted-foreground size-8" />
      </div>
      {search ? (
        <>
          <h3 className="text-lg font-semibold">No se encontraron equipos</h3>
          <p className="text-muted-foreground mt-1">
            No hay equipos que coincidan con "{search}"
          </p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold">No hay equipos registrados</h3>
          <p className="text-muted-foreground mt-1">
            Los equipos aparecerán aquí una vez que se inscriban
          </p>
        </>
      )}
      <Button asChild variant="outline" className="mt-6">
        <Link to="/signup-form">Inscribir equipo</Link>
      </Button>
    </div>
  );
}
