import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import {
  TableHeader as BaseTableHeader,
  TableHead,
  TableRow,
} from "~/components/ui/table";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { Table } from "@tanstack/react-table";
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
    table.getAllLeafColumns().find((col) => col.id === id)?.getIsVisible();

  const renderSortIcon = (columnId: string) => {
    if (sortColumn !== columnId) return null;
    if (sortDirection === "asc") return <ArrowDown className="size-4" />;
    if (sortDirection === "desc") return <ArrowUp className="size-4" />;
    return null;
  };

  return (
    <BaseTableHeader>
      <TableRow>
        {/* Select column */}
        <TableHead className="w-[50px] min-w-[50px] px-3 md:px-4 py-2 md:sticky md:left-0 bg-background z-20 border-r border-border">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        </TableHead>

        {/* Logo column */}
        {isVisible("logo") && (
          <TableHead className="w-[60px] min-w-[60px]" />
        )}

        {/* Team Name column */}
        {isVisible("name") && (
          <TableHead className="w-[200px] min-w-[200px] md:sticky md:left-[100px] bg-background z-20 border-r border-border">
            <Button
              className="p-0 hover:bg-transparent space-x-2"
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
              className="p-0 hover:bg-transparent space-x-2"
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
              className="p-0 hover:bg-transparent space-x-2"
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
              className="p-0 hover:bg-transparent space-x-2"
              variant="ghost"
              onClick={() => onSort?.("captainName")}
            >
              <span>Captain</span>
              {renderSortIcon("captainName")}
            </Button>
          </TableHead>
        )}

        {/* Actions column */}
        {isVisible("actions") && (
          <TableHead
            className={cn(
              "w-[100px] md:sticky md:right-0 bg-background z-30",
              "border-l border-border"
            )}
          >
            Actions
          </TableHead>
        )}
      </TableRow>
    </BaseTableHeader>
  );
}
