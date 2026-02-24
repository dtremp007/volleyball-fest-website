import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";

export function EmptyState() {
  return (
    <div className="flex items-center justify-center">
      <div className="mt-40 flex flex-col items-center">
        <div className="mb-6 space-y-2 text-center">
          <h2 className="text-lg font-medium">No teams</h2>
          <p className="text-muted-foreground text-sm">
            There are no teams registered yet. <br />
            Teams will appear here once they sign up.
          </p>
        </div>

        <Button variant="outline" asChild>
          <Link to="/signup-form">Register a Team</Link>
        </Button>
      </div>
    </div>
  );
}

export function NoResults({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <div className="flex items-center justify-center">
      <div className="mt-40 flex flex-col items-center">
        <div className="mb-6 space-y-2 text-center">
          <h2 className="text-lg font-medium">No results</h2>
          <p className="text-muted-foreground text-sm">
            Try another search, or adjusting the filters
          </p>
        </div>

        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
