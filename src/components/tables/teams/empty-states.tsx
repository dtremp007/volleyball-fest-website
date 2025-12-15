import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";

export function EmptyState() {
  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center mt-40">
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">No teams</h2>
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
      <div className="flex flex-col items-center mt-40">
        <div className="text-center mb-6 space-y-2">
          <h2 className="font-medium text-lg">No results</h2>
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
