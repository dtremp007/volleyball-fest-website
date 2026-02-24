import { useSuspenseQuery } from "@tanstack/react-query";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
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
import { EmptyEventsState } from "./empty-state";
import { EventRowItem } from "./row";

type Props = {
  seasonId: string;
};

export function EventsDataTable({ seasonId }: Props) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.matchup.getBySeasonId.queryOptions({ seasonId }),
  );

  const eventRows = data.events
    .map((event) => ({
      ...event,
      matchupCount: data.matchups.filter((matchup) => matchup.eventId === event.id)
        .length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const table = useReactTable({
    data: eventRows,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!eventRows.length) {
    return <EmptyEventsState />;
  }

  return (
    <div className="w-full">
      <div className="border-border overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.columnDef.meta?.className}
                  >
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
              <EventRowItem key={row.id} row={row} />
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total events</TableCell>
              <TableCell />
              <TableCell className="text-right font-medium tabular-nums">
                {eventRows.length}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
