import type { ColumnDef } from "@tanstack/react-table";
import type { RouterOutputs } from "~/trpc/router";
import { ActionsMenu } from "./actions-menu";

export type Category = RouterOutputs["category"]["getAll"][number];

const playoffFormatLabels: Record<string, string> = {
  "top-4": "Top 4",
  "top-5": "Top 5",
};

export const columns: ColumnDef<Category>[] = [
  {
    header: "Name",
    accessorKey: "name",
    meta: {
      className: "w-[200px] min-w-[200px]",
    },
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  {
    header: "Sort order",
    accessorKey: "sortOrder",
    meta: {
      className: "w-[110px] min-w-[110px]",
    },
    cell: ({ row }) => <span className="tabular-nums">{row.original.sortOrder}</span>,
  },
  {
    header: "Description",
    accessorKey: "description",
    meta: {
      className: "min-w-[220px]",
    },
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.getValue("description")}</span>
    ),
  },
  {
    header: "Color",
    accessorKey: "color",
    meta: {
      className: "w-[140px] min-w-[140px]",
    },
    cell: ({ row }) => {
      const color = row.original.color;
      return (
        <div className="flex items-center gap-2">
          <span
            className="size-4 shrink-0 rounded-full border"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <span className="font-mono text-xs uppercase">{color}</span>
        </div>
      );
    },
  },
  {
    header: "Playoff format",
    accessorKey: "playoffFormat",
    meta: {
      className: "w-[140px] min-w-[140px]",
    },
    cell: ({ row }) => (
      <span>
        {playoffFormatLabels[row.original.playoffFormat] ?? row.original.playoffFormat}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    meta: {
      className: "w-[60px] text-right border-l",
    },
    cell: ({ row }) => <ActionsMenu category={row.original} />,
  },
];
