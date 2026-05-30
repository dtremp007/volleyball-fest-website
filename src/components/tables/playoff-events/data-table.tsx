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
import { EmptyPlayoffEventsState } from "./empty-state";
import { PlayoffEventRowItem } from "./row";

type Props = {
  seasonId: string;
};

export function PlayoffEventsDataTable({ seasonId }: Props) {
  const trpc = useTRPC();
  const { data: events } = useSuspenseQuery(
    trpc.playoff.getScheduleEvents.queryOptions({ seasonId }),
  );
  const { data: builderState } = useSuspenseQuery(
    trpc.playoff.getScheduleBuilderState.queryOptions({ seasonId }),
  );

  const countMatchupsForEvent = (eventId: string) => {
    const event = builderState.events.find((item) => item.id === eventId);
    if (!event) return 0;
    return event.courts[0].matchups.length + event.courts[1].matchups.length;
  };

  const eventRows = events
    .map((event) => ({
      ...event,
      matchupCount: countMatchupsForEvent(event.id),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const table = useReactTable({
    data: eventRows,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!eventRows.length) {
    return <EmptyPlayoffEventsState seasonId={seasonId} />;
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
              <PlayoffEventRowItem key={row.id} row={row} />
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total playoff events</TableCell>
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
