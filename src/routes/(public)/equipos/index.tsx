import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Search, Users } from "lucide-react";
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

export const Route = createFileRoute("/(public)/equipos/")({
  component: EquiposPage,
});

function EquiposPage() {
  const trpc = useTRPC();
  const [search, setSearch] = useState("");

  const { data: publicContext, isLoading: seasonLoading } = useQuery(
    trpc.season.getPublicContext.queryOptions(),
  );
  const currentSeason = publicContext?.competitionSeason;

  const { data: teams, isLoading: teamsLoading } = useQuery(
    trpc.team.listPublic.queryOptions(
      { seasonId: currentSeason?.id ?? "" },
      { enabled: !!currentSeason?.id },
    ),
  );

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

  const filteredTeamsByCategory = useMemo(() => {
    if (!search.trim()) return teamsByCategory;

    const searchLower = search.toLowerCase();
    const filtered: Record<string, typeof teams> = {};

    for (const [category, categoryTeams] of Object.entries(teamsByCategory)) {
      const matchingTeams = categoryTeams!.filter((team) =>
        team.name.toLowerCase().includes(searchLower),
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
      <section className="overflow-hidden py-16">
        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mt-16 flex flex-col gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                Equipos
              </h1>
              <p className="mt-2 text-lg text-zinc-400">
                Conoce a todos los equipos participantes
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                type="search"
                placeholder="Buscar equipo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-zinc-700 bg-zinc-800/50 pl-10 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>
        </div>
      </section>

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
                  <div className="mb-6 flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{category}</h2>
                    <Badge variant="secondary">
                      {filteredTeamsByCategory[category]?.length ?? 0} equipos
                    </Badge>
                  </div>

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
  playerCount: number;
};

function TeamCard({ team }: { team: Team }) {
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
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
              {team.playerCount} jugadores
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Button asChild variant="outline" className="w-full">
          <Link to="/equipos/$teamId" params={{ teamId: team.id }}>
            Ver equipo
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function TeamsSkeleton() {
  return (
    <div className="space-y-12">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="mb-6 flex items-center gap-3">
            <div className="bg-muted h-8 w-48 animate-pulse rounded" />
            <div className="bg-muted h-6 w-20 animate-pulse rounded-full" />
          </div>

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
                  <div className="bg-muted h-10 w-full animate-pulse rounded" />
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
