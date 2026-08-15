import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Route } from "~/routes/(authenticated)/seasons/$seasonId/settings";
import { useTRPC } from "~/trpc/react";
import type { Category } from "./columns";

type Props = {
  category: Category;
};

export function ActionsMenu({ category }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = Route.useNavigate();

  const deleteMutation = useMutation(
    trpc.category.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Category deleted");
        queryClient.invalidateQueries({ queryKey: trpc.category.getAll.queryKey() });
      },
      onError: () => toast.error("Failed to delete category"),
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
              navigate({ search: (prev) => ({ ...prev, categoryId: category.id }) })
            }
          >
            <Pencil className="mr-2 size-4" />
            Edit category
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              deleteMutation.mutate({ id: category.id });
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            Delete category
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
