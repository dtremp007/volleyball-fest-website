import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableRow,
} from "~/components/ui/table";
import { Route } from "~/routes/(authenticated)/teams";
import { useTRPC } from "~/trpc/react";
import { BottomBarWrapper } from "./bottom-bar";
import { columns } from "./columns";
import { EmptyState, NoResults } from "./empty-states";
import { TeamRow } from "./row";
import { TableHeader } from "./table-header";

export function TeamsDataTable() {
  "use no memo";
  const trpc = useTRPC();
  const navigate = useNavigate();
  const { seasonId, categoryId } = Route.useSearch();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    categoryId: false, // Hidden column used only for filtering
  });

  // Fetch all teams for the season (no categoryId filter)
  const { data: teams } = useSuspenseQuery(trpc.team.list.queryOptions({ seasonId }));

  // Compute column filters from URL search params
  const columnFilters: ColumnFiltersState = useMemo(
    () => (categoryId ? [{ id: "categoryId", value: categoryId }] : []),
    [categoryId],
  );

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
      columnFilters,
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

  const handleClearFilters = () => {
    navigate({ to: "/teams", search: { seasonId, categoryId: undefined } });
  };

  // No teams at all for this season
  if (!tableData.length) {
    return <EmptyState />;
  }

  // Teams exist but none match the current filter
  const filteredRows = table.getFilteredRowModel().rows;
  if (categoryId && filteredRows.length === 0) {
    return <NoResults onClearFilters={handleClearFilters} />;
  }

  return (
    <div className="w-full">
      <div className="border-border overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader
            table={table}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
          />

          <TableBody className="border-r-0 border-l-0">
            {table.getRowModel().rows.map((row) => (
              <TeamRow key={row.id} row={row} />
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={7}>Total teams</TableCell>
              <TableCell className="text-right">
                {table.getFilteredRowModel().rows.length}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <BottomBarWrapper
        show={showBottomBar}
        selectedCount={selectedCount}
        selectedTeamIds={Object.keys(rowSelection)}
        onClearSelection={handleClearSelection}
        onDeleteSelected={handleDeleteSelected}
      />
    </div>
  );
}
