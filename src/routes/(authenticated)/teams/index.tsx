import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import z from "zod";
import {
  CategoryTabs,
  SeasonTabs,
  TeamsDataTable,
  TeamsSkeleton,
} from "~/components/tables/teams";
import { Skeleton } from "~/components/ui/skeleton";

export const Route = createFileRoute("/(authenticated)/teams/")({
  component: TeamsPage,
  validateSearch: z.object({
    seasonId: z.string().optional(),
    categoryId: z.string().optional(),
  }),
  beforeLoad: async ({ search, context }) => {
    if (!search.seasonId) {
      const seasons = await context.queryClient.fetchQuery(
        context.trpc.season.getAll.queryOptions(),
      );
      const currentSeason =
        seasons.find((season) => !["completed", "draft"].includes(season.state)) ||
        seasons[0];

      throw redirect({ to: "/teams", search: { seasonId: currentSeason.id } });
    }
    return { seasonId: search.seasonId };
  },
});

function TabsSkeleton() {
  return <Skeleton className="h-9 w-64 rounded-lg" />;
}

function TeamsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
        <p className="text-muted-foreground mt-2">View and manage all registered teams</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Suspense fallback={<TabsSkeleton />}>
          <SeasonTabs />
        </Suspense>

        <Suspense fallback={<TabsSkeleton />}>
          <CategoryTabs />
        </Suspense>
      </div>

      <Suspense fallback={<TeamsSkeleton />}>
        <TeamsDataTable />
      </Suspense>
    </div>
  );
}
