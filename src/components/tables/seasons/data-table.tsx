import { useNavigate } from "@tanstack/react-router";
import { type Row, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Calendar } from "lucide-react";
import { Card, CardContent } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { type Season, columns } from "./columns";

type Props = {
  seasons: Season[];
};

function SeasonRow({ row }: { row: Row<Season> }) {
  const navigate = useNavigate();

  const handleRowClick = (cellId: string, e: React.MouseEvent) => {
    // Don't navigate if clicking on actions column
    if (cellId === "actions") {
      return;
    }

    // Don't navigate if clicking on a link or button
    if (e.target instanceof HTMLElement && (e.target.closest("a") || e.target.closest("button"))) {
      return;
    }

    navigate({ to: "/seasons/$seasonId", params: { seasonId: row.original.id } });
  };

  return (
    <TableRow className="group h-[57px] cursor-pointer hover:bg-[#F2F1EF] hover:dark:bg-[#0f0f0f]">
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cn(cell.column.columnDef.meta?.className)}
          onClick={(e) => handleRowClick(cell.column.id, e)}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}

export function SeasonsDataTable({ seasons }: Props) {
  const table = useReactTable({
    data: seasons,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!seasons.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Calendar className="text-muted-foreground/50 size-12 mb-4" />
          <h3 className="text-lg font-medium">No seasons found</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Create a season first to start building schedules
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <div className="border-border rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {table.getHeaderGroups().map((headerGroup) =>
                headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(header.column.columnDef.meta?.className)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <SeasonRow key={row.id} row={row} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
