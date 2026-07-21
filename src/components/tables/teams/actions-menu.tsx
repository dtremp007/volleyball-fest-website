import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Route } from "~/routes/(authenticated)/seasons/$seasonId/teams";
import { useTRPC } from "~/trpc/react";
import type { Team } from "./columns";

type Props = {
  team: Team;
};

export function ActionsMenu({ team }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = Route.useNavigate();
  const { seasonId } = Route.useParams();

  const deleteMutation = useMutation(
    trpc.team.removeFromSeason.mutationOptions({
      onSuccess: () => {
        toast.success("Team deleted successfully");
        queryClient.invalidateQueries({
          queryKey: trpc.team.list.queryKey({ seasonId }),
        });
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
              navigate({ search: (prev) => ({ ...prev, teamId: team.id }) })
            }
          >
            <Pencil className="mr-2 size-4" />
            Edit Team
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href={`/api/team-pdf?seasonId=${encodeURIComponent(seasonId)}&teamId=${encodeURIComponent(team.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <FileText className="mr-2 size-4" />
              View PDF
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              deleteMutation.mutate({ seasonId, teamId: team.id });
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            Remove from Season
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
