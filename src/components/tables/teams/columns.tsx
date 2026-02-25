import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/router";
import { useTRPC } from "~/trpc/react";
import { ActionsMenu } from "./actions-menu";

export type Team = RouterOutputs["team"]["list"][number];

function FarAwayCell({ team }: { team: Team }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const updateIsFarAwayMutation = useMutation(
    trpc.team.updateIsFarAway.mutationOptions({
      onSuccess: async () => {
        toast.success("Team updated");
        await queryClient.invalidateQueries({
          queryKey: trpc.team.getById.queryKey({ id: team.id }),
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.team.list.queryKey(),
        });
      },
      onError: () => {
        toast.error("Failed to update team");
      },
    }),
  );

  const handleCheckedChange = (checked: boolean | "indeterminate") => {
    updateIsFarAwayMutation.mutate({
      id: team.id,
      isFarAway: checked === true,
    });
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="flex items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={Boolean(team.isFarAway)}
            onCheckedChange={handleCheckedChange}
            disabled={updateIsFarAwayMutation.isPending}
            aria-label="Far away"
          />
          {updateIsFarAwayMutation.isPending && (
            <Loader2 className="ml-1 size-3 animate-spin text-muted-foreground" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Far away</p>
      </TooltipContent>
    </Tooltip>
  );
}

export const columns: ColumnDef<Team>[] = [
  {
    id: "select",
    header: ({ table }) => {
      return (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      );
    },
    cell: ({ row }) => {
      return (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => {
            if (checked === "indeterminate") {
              row.toggleSelected();
            } else {
              row.toggleSelected(checked);
            }
          }}
          aria-label="Select row"
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    header: "Team Name",
    accessorKey: "name",
    meta: {
      className: "w-[200px] min-w-[200px] border-r p-0",
    },
    cell: ({ row }) => {
      const logoUrl = row.original.logoUrl;
      const name = row.original.name;

      return (
        <div className="flex items-center justify-between gap-2">
          <Avatar className="size-6">
            {logoUrl && <AvatarImage src={logoUrl} alt={`${name} logo`} />}
            <AvatarFallback className="text-[10px] font-medium">
              {name?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="pr-4">{name}</span>
        </div>
      );
    },
  },
  {
    id: "categoryId",
    accessorKey: "category.id",
    enableHiding: true,
    enableSorting: false,
  },
  {
    id: "category",
    header: "Category",
    accessorKey: "category.name",
    meta: {
      className: "w-[150px] min-w-[150px]",
    },
    cell: ({ row }) => (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          "bg-primary/10 text-primary",
        )}
      >
        {row.getValue("category")}
      </span>
    ),
  },
  {
    header: "Captain",
    accessorKey: "captainName",
    meta: {
      className: "w-[180px] min-w-[180px]",
    },
    cell: ({ row }) => <span>{row.getValue("captainName")}</span>,
  },
  {
    header: "Captain Number",
    accessorKey: "captainPhone",
    meta: {
      className: "w-[180px] min-w-[180px]",
    },
    cell: ({ row }) => (
      <Button variant="link" asChild>
        <a href={`whatsapp://send?phone=${row.getValue("captainPhone")}`} target="_blank">
          {row.getValue("captainPhone")}
        </a>
      </Button>
    ),
  },
  {
    id: "isFarAway",
    header: "Far Away",
    accessorKey: "isFarAway",
    meta: {
      className: "w-[80px] min-w-[80px]",
    },
    cell: ({ row }) => <FarAwayCell team={row.original} />,
    enableSorting: false,
  },
  {
    id: "comingFrom",
    header: "Coming From",
    accessorKey: "comingFrom",
    meta: {
      className: "w-[180px] min-w-[180px]",
    },
    cell: ({ row }) => (
      <span className="truncate">{row.original.comingFrom || "-"}</span>
    ),
    enableSorting: false,
  },
  {
    id: "actions",
    header: "Actions",
    meta: {
      className: "text-right border-l",
    },
    cell: ({ row }) => {
      return <ActionsMenu team={row.original} />;
    },
  },
];
