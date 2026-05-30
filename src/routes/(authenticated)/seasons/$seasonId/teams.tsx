import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import z from "zod";
import {
  CategoryTabs,
  TeamDetailsDrawer,
  TeamsDataTable,
  TeamsSkeleton,
} from "~/components/tables/teams";
import { Skeleton } from "~/components/ui/skeleton";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/teams")({
  component: TeamsPage,
  validateSearch: z.object({
    categoryId: z.string().optional(),
    teamId: z.string().optional(),
  }),
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
          <CategoryTabs />
        </Suspense>
      </div>

      <Suspense fallback={<TeamsSkeleton />}>
        <TeamsDataTable />
      </Suspense>

      <TeamDetailsDrawer />
    </div>
  );
}
