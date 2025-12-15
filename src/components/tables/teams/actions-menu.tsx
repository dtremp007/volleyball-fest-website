import { Link } from "@tanstack/react-router";
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { Team } from "./columns";

type Props = {
  team: Team;
};

export function ActionsMenu({ team }: Props) {
  const handleDelete = () => {
    // TODO: Implement delete functionality
    console.log("Delete team:", team.id);
  };

  return (
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
            to="/teams/$teamId"
            params={{ teamId: team.id }}
            className="flex items-center"
          >
            <Eye className="mr-2 size-4" />
            View Details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/teams/$teamId"
            params={{ teamId: team.id }}
            className="flex items-center"
          >
            <Pencil className="mr-2 size-4" />
            Edit Team
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 size-4" />
          Delete Team
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
