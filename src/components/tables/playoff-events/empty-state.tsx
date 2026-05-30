import { Link } from "@tanstack/react-router";
import { GitBranch } from "lucide-react";
import { Button } from "~/components/ui/button";

type Props = {
  seasonId: string;
};

export function EmptyPlayoffEventsState({ seasonId }: Props) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed py-16">
      <div className="flex flex-col items-center text-center">
        <GitBranch className="text-muted-foreground/50 mb-3 size-10" />
        <h3 className="font-medium">No playoff events found</h3>
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          Generate playoff brackets and build the playoff schedule to see events here.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/seasons/$seasonId/playoffs" params={{ seasonId }}>
            Go to playoffs
          </Link>
        </Button>
      </div>
    </div>
  );
}
