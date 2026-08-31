import { Link, useParams, useSearch } from "@tanstack/react-router";
import { cn } from "~/lib/utils";

const paidFilters = [
  { value: undefined, label: "All" },
  { value: "paid" as const, label: "Paid" },
  { value: "unpaid" as const, label: "Unpaid" },
];

export function PaidTabs() {
  const { seasonId } = useParams({
    from: "/(authenticated)/seasons/$seasonId/teams",
  });
  const { hasPaid } = useSearch({
    from: "/(authenticated)/seasons/$seasonId/teams",
  });

  return (
    <div className="scrollbar-none max-w-full overflow-x-auto">
      <nav
        className="bg-muted inline-flex h-9 items-center rounded-lg p-1"
        aria-label="Payment filter"
      >
        {paidFilters.map((filter) => (
          <Link
            key={filter.label}
            to="/seasons/$seasonId/teams"
            params={{ seasonId }}
            search={(prev) => ({ ...prev, hasPaid: filter.value })}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              hasPaid === filter.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
