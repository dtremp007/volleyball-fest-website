import { useSuspenseQuery } from "@tanstack/react-query";
import {
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Table, TableBody } from "~/components/ui/table";
import { useTableScroll } from "~/hooks/use-table-scroll";
import { useTRPC } from "~/trpc/react";
import { BottomBarWrapper } from "./bottom-bar";
import { columns } from "./columns";
import { EmptyState } from "./empty-states";
import { TeamRow } from "./row";
import { TableHeader } from "./table-header";

export function TeamsDataTable() {
  "use no memo";
  const trpc = useTRPC();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { data: teams } = useSuspenseQuery(trpc.team.list.queryOptions());

  const tableData = useMemo(() => teams ?? [], [teams]);

  const table = useReactTable({
    data: tableData,
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
  });

  const selectedCount = Object.keys(rowSelection).length;
  const showBottomBar = selectedCount > 0;

  // Get current sort state
  const sortColumn = sorting[0]?.id;
  const sortDirection = sorting[0]?.desc ? "desc" : sorting[0] ? "asc" : null;

  const handleSort = (column: string) => {
    const currentSort = sorting[0];
    if (currentSort?.id === column) {
      if (currentSort.desc) {
        // If already descending, clear sort
        setSorting([]);
      } else {
        // If ascending, switch to descending
        setSorting([{ id: column, desc: true }]);
      }
    } else {
      // New column, start with ascending
      setSorting([{ id: column, desc: false }]);
    }
  };

  const handleClearSelection = () => {
    setRowSelection({});
  };

  const handleDeleteSelected = () => {
    // TODO: Implement bulk delete
    const selectedIds = Object.keys(rowSelection);
    console.log("Delete teams:", selectedIds);
    setRowSelection({});
  };

  if (!tableData.length) {
    return <EmptyState />;
  }

  return (
    <div className="w-full">
      <div
        className="border-border rounded-lg border"
      >
        <Table>
          <TableHeader
            table={table}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />

          <TableBody className="border-l-0 border-r-0">
            {table.getRowModel().rows.map((row) => (
              <TeamRow key={row.id} row={row} />
            ))}
          </TableBody>
        </Table>
      </div>

      <BottomBarWrapper
        show={showBottomBar}
        selectedCount={selectedCount}
        onClearSelection={handleClearSelection}
        onDeleteSelected={handleDeleteSelected}
      />
    </div>
  );
}
