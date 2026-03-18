import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import {
    StandingsEmpty,
    StandingsSkeleton,
    StandingsTable,
} from "~/components/standings";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/posiciones")({
    component: PosicionesPage,
    loader: async ({ context }) => {
        Promise.all([
            context.queryClient.ensureQueryData(
                context.trpc.season.getByState.queryOptions({
                    state: "active",
                }),
            ),
            context.queryClient.ensureQueryData(
                context.trpc.matchup.getStandings.queryOptions({
                    seasonId: "season-2026-spring",
                }),
            ),
        ]);
    },
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
            <section className="overflow-hidden mt-10">
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
                    {isLoading
                        ? <StandingsSkeleton variant="full" />
                        : categories.length === 0
                        ? <StandingsEmpty />
                        : (
                            <div className="space-y-12">
                                {categories.map((category) => (
                                    <div key={category}>
                                        <div className="mb-6 flex items-center gap-3">
                                            <h2 className="text-2xl font-bold">
                                                {category}
                                            </h2>
                                        </div>

                                        <div className="overflow-hidden rounded-lg border">
                                            <StandingsTable
                                                standings={standingsByCategory[
                                                    category
                                                ] ?? []}
                                                variant="full"
                                            />
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
