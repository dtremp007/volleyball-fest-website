import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "~/components/ui/badge";
import { ActionsMenu } from "./actions-menu";

export type Season = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  state: string;
  matchupCount: number;
  eventCount: number;
  hasMatchups: boolean;
};

const stateColors: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  signup_open: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  signup_closed: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  active: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  completed: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

const stateLabels: Record<string, string> = {
  draft: "Draft",
  signup_open: "Sign-up Open",
  signup_closed: "Sign-up Closed",
  active: "Active",
  completed: "Completed",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const columns: ColumnDef<Season>[] = [
  {
    header: "Name",
    accessorKey: "name",
    meta: {
      className: "w-[200px] min-w-[200px]",
    },
    cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
  },
  {
    header: "Dates",
    accessorKey: "startDate",
    meta: {
      className: "w-[220px] min-w-[220px]",
    },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.startDate)} — {formatDate(row.original.endDate)}
      </span>
    ),
  },
  {
    header: "State",
    accessorKey: "state",
    meta: {
      className: "w-[140px] min-w-[140px]",
    },
    cell: ({ row }) => {
      const state = row.getValue("state") as string;
      return (
        <Badge className={stateColors[state] || stateColors.draft} variant="secondary">
          {stateLabels[state] || state}
        </Badge>
      );
    },
  },
  {
    header: "Matchups",
    accessorKey: "matchupCount",
    meta: {
      className: "w-[100px] min-w-[100px] text-center",
    },
    cell: ({ row }) => (
      <span className="tabular-nums">{row.getValue("matchupCount")}</span>
    ),
  },
  {
    header: "Events",
    accessorKey: "eventCount",
    meta: {
      className: "w-[100px] min-w-[100px] text-center",
    },
    cell: ({ row }) => <span className="tabular-nums">{row.getValue("eventCount")}</span>,
  },
  {
    id: "actions",
    header: "",
    meta: {
      className: "w-[60px] text-right",
    },
    cell: ({ row }) => {
      return <ActionsMenu season={row.original} />;
    },
  },
];
