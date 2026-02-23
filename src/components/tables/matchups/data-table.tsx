import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useSuspenseQuery } from "@tanstack/react-query";
import { flexRender } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useTRPC } from "~/trpc/react";
import { columns } from "./columns";
import { EmptyMatchupsState } from "./empty-state";
import { MatchupRowItem } from "./row";

const TIME_SLOTS = [
  "4:15 PM",
  "5:00 PM",
  "5:45 PM",
  "6:30 PM",
  "7:15 PM",
  "8:00 PM",
  "8:45 PM",
  "9:30 PM",
];

type Props = {
  seasonId: string;
};

export function MatchupsDataTable({ seasonId }: Props) {
  "use no memo";
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.matchup.getBySeasonId.queryOptions({ seasonId }));

  const eventsById = new Map(data.events.map((event) => [event.id, event]));

  const matchupRows = data.matchups
    .map((matchup) => {
      const event = matchup.eventId ? eventsById.get(matchup.eventId) : null;
      const slotLabel =
        matchup.slotIndex !== null ? (TIME_SLOTS[matchup.slotIndex] ?? `Slot ${matchup.slotIndex + 1}`) : null;

      return {
        id: matchup.id,
        teamAName: matchup.teamA.name,
        teamBName: matchup.teamB.name,
        category: matchup.category,
        eventName: event?.name ?? null,
        eventDate: event?.date ?? null,
        courtId: matchup.courtId,
        slotLabel,
        isScheduled: matchup.eventId !== null,
        bestOf: matchup.bestOf,
        teamASetsWon: matchup.teamASetsWon,
        teamBSetsWon: matchup.teamBSetsWon,
        setsSummary:
          matchup.sets
            .filter((setScore) => setScore.teamAScore !== null && setScore.teamBScore !== null)
            .map((setScore) => `S${setScore.set} ${setScore.teamAScore}-${setScore.teamBScore}`)
            .join(" | ") || "-",
        winnerName:
          matchup.teamASetsWon >= Math.floor(matchup.bestOf / 2) + 1
            ? matchup.teamA.name
            : matchup.teamBSetsWon >= Math.floor(matchup.bestOf / 2) + 1
              ? matchup.teamB.name
              : null,
      };
    })
    .sort((a, b) => {
      if (a.isScheduled !== b.isScheduled) return a.isScheduled ? -1 : 1;
      if (a.eventDate && b.eventDate && a.eventDate !== b.eventDate) {
        return a.eventDate.localeCompare(b.eventDate);
      }
      return a.teamAName.localeCompare(b.teamAName);
    });

  const table = useReactTable({
    data: matchupRows,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });
  const leafColumnCount = table.getAllLeafColumns().length;

  if (!matchupRows.length) {
    return <EmptyMatchupsState />;
  }

  return (
    <div className="w-full">
      <div className="border-border overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                )),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <MatchupRowItem key={row.id} row={row} />
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={Math.max(leafColumnCount - 1, 1)}>Total matchups</TableCell>
              <TableCell className="font-medium tabular-nums text-right">{matchupRows.length}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
