import { useQuery } from "@tanstack/react-query";
import { flexRender, getCoreRowModel, type Row, useReactTable } from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { Route } from "~/routes/(authenticated)/seasons/$seasonId/settings";
import { useTRPC } from "~/trpc/react";
import { columns, type Category } from "./columns";

function CategoryRow({ row }: { row: Row<Category> }) {
  const navigate = Route.useNavigate();

  const handleRowClick = (cellId: string, e: React.MouseEvent) => {
    if (cellId === "actions") return;
    if (
      e.target instanceof HTMLElement &&
      (e.target.closest("a") || e.target.closest("button"))
    ) {
      return;
    }

    navigate({
      search: (prev) => ({ ...prev, categoryId: row.original.id }),
      replace: true,
      resetScroll: false,
    });
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

export function CategoriesDataTable() {
  const trpc = useTRPC();
  const { data: categories = [] } = useQuery(trpc.category.getAll.queryOptions());

  const table = useReactTable({
    data: categories,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!categories.length) {
    return (
      <p className="text-muted-foreground py-4 text-center text-sm">
        No categories yet. Add one to get started.
      </p>
    );
  }

  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
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
              )),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <CategoryRow key={row.id} row={row} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
