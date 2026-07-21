import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { LAST_SEASON_STORAGE_KEY, selectAdminEntrySeason } from "~/lib/season-navigation";

export const Route = createFileRoute("/(authenticated)/admin")({
  component: AdminEntryPage,
  loader: async ({ context }) => {
    const seasons = await context.queryClient.fetchQuery(
      context.trpc.season.getAll.queryOptions(),
    );
    return { seasons };
  },
});

function AdminEntryPage() {
  const { seasons } = Route.useLoaderData();
  const navigate = useNavigate();

  useEffect(() => {
    const selected = selectAdminEntrySeason(
      seasons,
      localStorage.getItem(LAST_SEASON_STORAGE_KEY),
    );
    if (selected) {
      navigate({
        to: "/seasons/$seasonId",
        params: { seasonId: selected.id },
        replace: true,
      });
    }
  }, [navigate, seasons]);

  if (!seasons.length) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">Create your first season</h1>
        <p className="text-muted-foreground">
          Seasons keep registration, teams, schedules, and scores in one context.
        </p>
        <Button asChild>
          <Link to="/seasons/new">Create season</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10" aria-live="polite">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-4 h-4 w-80" />
    </div>
  );
}
