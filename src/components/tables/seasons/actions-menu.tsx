import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Calendar, Eye, Loader, MoreHorizontal, Settings2, Trash2 } from "lucide-react";
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
import type { Season } from "./columns";

type Props = {
  season: Season;
};

export function ActionsMenu({ season }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    trpc.season.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Season deleted successfully");
        queryClient.invalidateQueries({ queryKey: trpc.season.getAll.queryKey() });
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
              to="/seasons/$seasonId"
              params={{ seasonId: season.id }}
              className="flex items-center"
            >
              <Eye className="mr-2 size-4" />
              View Overview
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              to="/seasons/$seasonId/configure"
              params={{ seasonId: season.id }}
              className="flex items-center"
            >
              <Settings2 className="mr-2 size-4" />
              Configure
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              to="/seasons/$seasonId/build"
              params={{ seasonId: season.id }}
              className="flex items-center"
            >
              <Calendar className="mr-2 size-4" />
              Build Schedule
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              deleteMutation.mutate({ id: season.id });
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            Delete Season
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
