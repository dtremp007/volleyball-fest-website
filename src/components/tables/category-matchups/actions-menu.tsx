import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Loader, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Route } from "~/routes/(authenticated)/seasons/$seasonId/configure/$categoryId/matchups";
import { useTRPC } from "~/trpc/react";
import type { CategoryMatchupRow } from "./columns";

type Props = {
  matchup: CategoryMatchupRow;
};

export function ActionsMenu({ matchup }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = Route.useNavigate();
  const { seasonId, categoryId } = Route.useParams();

  const deleteMutation = useMutation(
    trpc.matchup.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Matchup deleted");
        await queryClient.invalidateQueries({
          queryKey: trpc.matchup.getBySeasonId.queryKey({ seasonId }),
        });
        await router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete matchup");
      },
    }),
  );

  return (
    <div className="flex items-center justify-end">
      {deleteMutation.isPending && <Loader className="size-4 animate-spin" />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={() =>
              navigate({
                search: (prev) => ({ ...prev, matchupId: matchup.id }),
                replace: true,
                resetScroll: false,
              })
            }
          >
            <Pencil className="mr-2 size-4" />
            Edit matchup
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              const confirmed = window.confirm(
                matchup.hasScores
                  ? `Delete ${matchup.teamA.name} vs ${matchup.teamB.name}? This matchup has scores, and those scores will be deleted.`
                  : `Delete ${matchup.teamA.name} vs ${matchup.teamB.name}?`,
              );
              if (!confirmed) return;
              deleteMutation.mutate({
                seasonId,
                categoryId,
                matchupId: matchup.id,
              });
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            Delete matchup
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
