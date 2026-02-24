import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/router";
import { ActionsMenu } from "./actions-menu";

export type Team = RouterOutputs["team"]["list"][number];

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
