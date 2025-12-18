import type { Table } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  TableHeader as BaseTableHeader,
  TableHead,
  TableRow,
} from "~/components/ui/table";
import type { Team } from "./columns";

interface Props {
  table: Table<Team>;
  sortColumn?: string;
  sortDirection?: "asc" | "desc" | null;
  onSort?: (column: string) => void;
}

export function TableHeader({ table, sortColumn, sortDirection, onSort }: Props) {
  "use no memo";
  const isVisible = (id: string) =>
    table
      .getAllLeafColumns()
      .find((col) => col.id === id)
      ?.getIsVisible();

  const renderSortIcon = (columnId: string) => {
    if (sortColumn !== columnId) return null;
    if (sortDirection === "asc") return <ArrowDown className="size-4" />;
    if (sortDirection === "desc") return <ArrowUp className="size-4" />;
    return null;
  };

  return (
    <BaseTableHeader className="border-r-0 border-l-0">
      <TableRow className="hover:bg-transparent">
        {/* Select column */}
        <TableHead className="bg-background z-20 w-[50px] min-w-[50px]">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </TableHead>

        {/* Team Name column */}
        {isVisible("name") && (
          <TableHead className="bg-background w-[200px] min-w-[200px] border-r">
            <Button
              className="space-x-2 p-0 hover:bg-transparent"
              variant="ghost"
              onClick={() => onSort?.("name")}
            >
              <span>Team Name</span>
              {renderSortIcon("name")}
            </Button>
          </TableHead>
        )}

        {/* Category column */}
        {isVisible("category") && (
          <TableHead className="w-[150px]">
            <Button
              className="space-x-2 p-0 hover:bg-transparent"
              variant="ghost"
              onClick={() => onSort?.("category")}
            >
              <span>Category</span>
              {renderSortIcon("category")}
            </Button>
          </TableHead>
        )}

        {/* Season column */}
        {isVisible("season") && (
          <TableHead className="w-[150px]">
            <Button
              className="space-x-2 p-0 hover:bg-transparent"
              variant="ghost"
              onClick={() => onSort?.("season")}
            >
              <span>Season</span>
              {renderSortIcon("season")}
            </Button>
          </TableHead>
        )}

        {/* Captain column */}
        {isVisible("captainName") && (
          <TableHead className="w-[180px]">
            <Button
              className="space-x-2 p-0 hover:bg-transparent"
              variant="ghost"
              onClick={() => onSort?.("captainName")}
            >
              <span>Captain</span>
              {renderSortIcon("captainName")}
            </Button>
          </TableHead>
        )}
        {/* captain number column */}
        {isVisible("captainPhone") && (
          <TableHead className="w-[180px]">
            <span>Captain Number</span>
          </TableHead>
        )}

        {/* Actions column */}
        {isVisible("actions") && (
          <TableHead className={"bg-background w-[50px] border-l"}>Actions</TableHead>
        )}
      </TableRow>
    </BaseTableHeader>
  );
}
