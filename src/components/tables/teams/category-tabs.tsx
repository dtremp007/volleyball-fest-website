import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { cn } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";

export function CategoryTabs() {
  const trpc = useTRPC();
  const { seasonId } = useParams({
    from: "/(authenticated)/seasons/$seasonId/teams",
  });
  const { categoryId } = useSearch({
    from: "/(authenticated)/seasons/$seasonId/teams",
  });

  const { data: categories } = useSuspenseQuery(trpc.category.getAll.queryOptions());

  return (
    <div className="scrollbar-none max-w-full overflow-x-auto">
      <nav
        className="bg-muted inline-flex h-9 items-center rounded-lg p-1"
        aria-label="Category tabs"
      >
        <Link
          to="/seasons/$seasonId/teams"
          params={{ seasonId }}
          search={{ categoryId: undefined }}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            !categoryId
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            to="/seasons/$seasonId/teams"
            params={{ seasonId }}
            search={{ categoryId: category.id }}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              categoryId === category.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {category.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
