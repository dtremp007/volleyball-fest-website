import { createFileRoute } from "@tanstack/react-router";
import { SeasonsDataTable } from "~/components/tables/seasons";

export const Route = createFileRoute("/(authenticated)/seasons/")({
  component: SeasonsPage,
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">Seasons</h2>
        <p className="text-muted-foreground mt-2">
          Manage your volleyball seasons and schedules
        </p>
      </div>

      <SeasonsDataTable seasons={seasons} />
    </div>
  );
}
