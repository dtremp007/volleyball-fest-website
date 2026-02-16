import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "~/components/ui/badge";
import { ActionsMenu } from "./actions-menu";

export type EventRow = {
  id: string;
  name: string;
  date: string;
  seasonId: string;
  matchupCount: number;
};


export const columns: ColumnDef<EventRow>[] = [
  {
    header: "Date",
    accessorKey: "date",
    meta: {
      className: "w-[220px] min-w-[220px]",
    },
    cell: ({ row }) => (
      <span className="text-muted-foreground">{format(new Date(row.original.date), "MMM d, yyyy")}</span>
    ),
  },
  {
    header: "Games",
    accessorKey: "matchupCount",
    meta: {
      className: "w-[120px] min-w-[120px]",
    },
    cell: ({ row }) => (
      <Badge variant="secondary" className="tabular-nums">
        {row.original.matchupCount}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "",
    meta: {
      className: "w-[60px] text-right",
    },
    cell: ({ row }) => <ActionsMenu event={row.original} />,
  },
];
