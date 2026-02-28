import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "~/components/ui/badge";
import { EditableScoreCell } from "./editable-score-cell";

export type SetSubRow = {
  id: string;
  depth: 1;
  rowType: "set";
  matchupId: string;
  teamAId: string;
  teamBId: string;
  set: number;
  teamAScore: number | null;
  teamBScore: number | null;
  teamAName: string;
  teamBName: string;
  bestOf: number;
  category: string;
  courtId: string | null;
  slotLabel: string | null;
  isScheduled: boolean;
};

export type MatchupTableRow = {
  id: string;
  depth: 0;
  rowType: "matchup";
  teamAName: string;
  teamBName: string;
  teamAId: string;
  teamBId: string;
  category: string;
  eventName: string | null;
  eventDate: string | null;
  courtId: string | null;
  slotLabel: string | null;
  isScheduled: boolean;
  bestOf: number;
  teamASetsWon: number;
  teamBSetsWon: number;
  subRows: SetSubRow[];
};

export type MatchupRow = MatchupTableRow | SetSubRow;

export const columns: ColumnDef<MatchupRow>[] = [
  {
    header: "Set",
    id: "set",
    meta: { className: "w-[60px] min-w-[60px]" },
    cell: ({ row }) =>
      row.depth === 1 ? (
        <span className="text-muted-foreground text-sm">
          Set {(row.original as SetSubRow).set}
        </span>
      ) : null,
  },
  {
    header: "Team A",
    accessorKey: "teamAName",
    meta: { className: "w-[140px] min-w-[140px]" },
    cell: ({ row }) =>
      row.depth === 0 ? (
        <span className="font-medium">
          {(row.original as MatchupTableRow).teamAName}
        </span>
      ) : null,
  },
  {
    header: "Score A",
    id: "scoreA",
    meta: { className: "w-[80px] min-w-[80px]" },
    cell: (ctx) =>
      ctx.row.depth === 1 ? (
        <EditableScoreCell
          row={ctx.row}
          table={ctx.table}
          teamKey="teamA"
        />
      ) : null,
  },
  {
    header: "Team B",
    accessorKey: "teamBName",
    meta: { className: "w-[140px] min-w-[140px]" },
    cell: ({ row }) =>
      row.depth === 0 ? (
        <span className="font-medium">
          {(row.original as MatchupTableRow).teamBName}
        </span>
      ) : null,
  },
  {
    header: "Score B",
    id: "scoreB",
    meta: { className: "w-[80px] min-w-[80px]" },
    cell: (ctx) =>
      ctx.row.depth === 1 ? (
        <EditableScoreCell
          row={ctx.row}
          table={ctx.table}
          teamKey="teamB"
        />
      ) : null,
  },
  {
    header: "Category",
    accessorKey: "category",
    meta: { className: "w-[120px] min-w-[120px]" },
    cell: ({ row }) =>
      row.depth === 0 ? (
        <span className="text-muted-foreground">
          {(row.original as MatchupTableRow).category}
        </span>
      ) : null,
  },
  {
    header: "Court",
    accessorKey: "courtId",
    meta: { className: "w-[80px] min-w-[80px]" },
    cell: ({ row }) =>
      row.depth === 0 ? (
        <span className="text-muted-foreground">
          {(row.original as MatchupTableRow).courtId
            ? `Court ${(row.original as MatchupTableRow).courtId}`
            : "-"}
        </span>
      ) : null,
  },
  {
    header: "Time",
    accessorKey: "slotLabel",
    meta: { className: "w-[100px] min-w-[100px]" },
    cell: ({ row }) =>
      row.depth === 0 ? (
        <span className="text-muted-foreground">
          {(row.original as MatchupTableRow).slotLabel ?? "-"}
        </span>
      ) : null,
  },
  {
    header: "Status",
    accessorKey: "isScheduled",
    meta: { className: "w-[100px] min-w-[100px]" },
    cell: ({ row }) =>
      row.depth === 0 ? (
        (row.original as MatchupTableRow).isScheduled ? (
          <Badge
            className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            variant="secondary"
          >
            Scheduled
          </Badge>
        ) : (
          <Badge
            className="bg-amber-500/15 text-amber-700 dark:text-amber-300"
            variant="secondary"
          >
            Pending
          </Badge>
        )
      ) : null,
  },
];
