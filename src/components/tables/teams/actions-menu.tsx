import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Eye, FileText, Loader, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useTRPC } from "~/trpc/react";
import type { Team } from "./columns";

type Props = {
  team: Team;
};

export function ActionsMenu({ team }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    trpc.team.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Team deleted successfully");
        queryClient.invalidateQueries({ queryKey: trpc.team.list.queryKey() });
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
          <DropdownMenuItem asChild>
            <Link
              to="/signup-form"
              search={{ teamId: team.id }}
              className="flex items-center"
            >
              <Eye className="mr-2 size-4" />
              Edit Team
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href={`/api/team-pdf?id=${team.id}`}
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
              deleteMutation.mutate({ id: team.id });
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            Delete Team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
