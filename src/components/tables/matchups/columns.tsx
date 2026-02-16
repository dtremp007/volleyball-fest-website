import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "~/components/ui/badge";

export type MatchupRow = {
  id: string;
  teamAName: string;
  teamBName: string;
  category: string;
  eventName: string | null;
  eventDate: string | null;
  courtId: string | null;
  slotLabel: string | null;
  isScheduled: boolean;
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Unscheduled";
  return new Date(dateStr).toLocaleDateString("es-MX", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const columns: ColumnDef<MatchupRow>[] = [
  {
    header: "Matchup",
    accessorKey: "teamAName",
    meta: {
      className: "w-[280px] min-w-[280px]",
    },
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.teamAName} vs {row.original.teamBName}
      </span>
    ),
  },
  {
    header: "Category",
    accessorKey: "category",
    meta: {
      className: "w-[140px] min-w-[140px]",
    },
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.category}</span>,
  },
  {
    header: "Court",
    accessorKey: "courtId",
    meta: {
      className: "w-[100px] min-w-[100px]",
    },
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.courtId ? `Court ${row.original.courtId}` : "-"}</span>
    ),
  },
  {
    header: "Time",
    accessorKey: "slotLabel",
    meta: {
      className: "w-[120px] min-w-[120px]",
    },
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.slotLabel ?? "-"}</span>,
  },
  {
    header: "Status",
    accessorKey: "isScheduled",
    meta: {
      className: "w-[120px] min-w-[120px]",
    },
    cell: ({ row }) =>
      row.original.isScheduled ? (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" variant="secondary">
          Scheduled
        </Badge>
      ) : (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300" variant="secondary">
          Pending
        </Badge>
      ),
  },
];
