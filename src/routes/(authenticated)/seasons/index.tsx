import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleAlert, Plus } from "lucide-react";
import { useEffect } from "react";
import { SeasonsDataTable } from "~/components/tables/seasons";
import { Button } from "~/components/ui/button";
import { LAST_SEASON_STORAGE_KEY } from "~/lib/season-navigation";

export const Route = createFileRoute("/(authenticated)/seasons/")({
  component: SeasonsPage,
  validateSearch: (search: Record<string, unknown>) =>
    search.notice === "season-not-found"
      ? ({ notice: "season-not-found" } as const)
      : ({} as { notice?: undefined }),
  loader: async ({ context }) => {
    const seasons = await context.queryClient.fetchQuery(
      context.trpc.season.getAll.queryOptions(),
    );

    // Fetch matchup and event data for each season
    const seasonsWithData = await Promise.all(
      seasons.map(async (season) => {
        const matchupData = await context.queryClient.fetchQuery(
          context.trpc.matchup.getBySeasonId.queryOptions({ seasonId: season.id }),
        );

        return {
          ...season,
          matchupCount: matchupData.matchups.length,
          eventCount: matchupData.events.length,
          hasMatchups: matchupData.hasMatchups,
        };
      }),
    );

    return { seasons: seasonsWithData };
  },
});

function SeasonsPage() {
  const { seasons } = Route.useLoaderData();
  const { notice } = Route.useSearch();

  useEffect(() => {
    if (notice === "season-not-found") {
      localStorage.removeItem(LAST_SEASON_STORAGE_KEY);
    }
  }, [notice]);

  return (
    <div className="container mx-auto px-4 py-8">
      {notice === "season-not-found" && (
        <div
          role="status"
          className="border-border bg-muted/50 mb-6 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <p>That season no longer exists. Choose another season or create a new one.</p>
        </div>
      )}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Seasons</h1>
          <p className="text-muted-foreground mt-2">
            Manage your volleyball seasons and schedules
          </p>
        </div>
        <Button asChild>
          <Link to="/seasons/new">
            <Plus className="size-4" />
            Create season
          </Link>
        </Button>
      </div>

      <SeasonsDataTable seasons={seasons} />
    </div>
  );
}
