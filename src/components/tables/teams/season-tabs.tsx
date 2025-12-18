import { Link, useSearch } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";

export function SeasonTabs() {
  const trpc = useTRPC();
  const { seasonId, categoryId } = useSearch({ from: "/(authenticated)/teams/" });

  const { data: seasons } = useSuspenseQuery(trpc.season.getAll.queryOptions());

  return (
    <nav
      className="bg-muted inline-flex h-9 items-center justify-center rounded-lg p-1"
      aria-label="Season tabs"
    >
      {seasons.map((season) => (
        <Link
          key={season.id}
          to="/teams"
          search={{ seasonId: season.id, categoryId }}
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            seasonId === season.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {season.name}
        </Link>
      ))}
    </nav>
  );
}
