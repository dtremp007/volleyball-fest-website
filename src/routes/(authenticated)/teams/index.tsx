import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { TeamsDataTable, TeamsSkeleton } from "~/components/tables/teams";

export const Route = createFileRoute("/(authenticated)/teams/")({
  component: TeamsPage,
});

function TeamsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all registered teams
        </p>
      </div>

      <Suspense fallback={<TeamsSkeleton />}>
        <TeamsDataTable />
      </Suspense>
    </div>
  );
}
