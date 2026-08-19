import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import z from "zod";
import {
  CategoryMatchupsDataTable,
  MatchupPairingDrawer,
  NEW_MATCHUP_ID,
} from "~/components/tables/category-matchups";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute(
  "/(authenticated)/seasons/$seasonId/configure/$categoryId/matchups",
)({
  component: CategoryMatchupsPage,
  validateSearch: z.object({
    matchupId: z.string().optional(),
  }),
});

function CategoryMatchupsPage() {
  const navigate = Route.useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() =>
            navigate({
              search: (prev) => ({ ...prev, matchupId: NEW_MATCHUP_ID }),
              replace: true,
              resetScroll: false,
            })
          }
        >
          <Plus className="size-4" />
          Add Matchup
        </Button>
      </div>

      <CategoryMatchupsDataTable />
      <MatchupPairingDrawer />
    </div>
  );
}
