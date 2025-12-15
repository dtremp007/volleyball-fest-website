import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import { ActionsMenu } from "./actions-menu";

export type Team = {
  id: string;
  name: string;
  logoUrl: string;
  category: string;
  captainName: string;
  captainPhone: string;
  coCaptainName: string;
  coCaptainPhone: string;
  unavailableDates: string;
  comingFrom: string;
  season: string;
};

export const columns: ColumnDef<Team>[] = [
  {
    id: "select",
    meta: {
      className:
        "md:sticky md:left-0 bg-background group-hover:bg-muted/50 z-20 border-r border-border",
    },
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
    id: "logoUrl",
    header: "",
    meta: {
      className: "w-[60px] min-w-[60px]",
    },
    cell: ({ row }) => {
      const logoUrl = row.getValue("logoUrl") as string;
      const name = row.original.name;

      return (
        <Avatar className="size-8">
          {logoUrl && <AvatarImage src={logoUrl} alt={`${name} logo`} />}
          <AvatarFallback className="text-xs font-medium">
            {name?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      );
    },
    enableSorting: false,
  },
  {
    header: "Team Name",
    accessorKey: "name",
    meta: {
      className:
        "w-[200px] min-w-[200px] md:sticky md:left-[100px] bg-background group-hover:bg-muted/50 z-20 border-r border-border",
    },
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  {
    header: "Category",
    accessorKey: "category",
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
    header: "Season",
    accessorKey: "season",
    meta: {
      className: "w-[150px] min-w-[150px]",
    },
    cell: ({ row }) => <span>{row.getValue("season")}</span>,
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
    id: "actions",
    header: "Actions",
    meta: {
      className:
        "w-[100px] text-right md:sticky md:right-0 bg-background group-hover:bg-muted/50 z-30 border-l border-border",
    },
    cell: ({ row }) => {
      return <ActionsMenu team={row.original} />;
    },
  },
];
