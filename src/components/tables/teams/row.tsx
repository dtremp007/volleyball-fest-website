import { flexRender, type Row } from "@tanstack/react-table";
import { TableCell, TableRow } from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { Route } from "~/routes/(authenticated)/teams";
import type { Team } from "./columns";

type Props = {
  row: Row<Team>;
};

export function TeamRow({ row }: Props) {
  "use no memo";
  const navigate = Route.useNavigate();

  const handleRowClick = (cellId: string, e: React.MouseEvent) => {
    // Don't navigate if clicking on checkbox or actions column
    if (cellId === "select" || cellId === "actions") {
      return;
    }

    // Prevent event bubbling for checkbox clicks
    if (e.target instanceof HTMLElement && e.target.closest('[role="checkbox"]')) {
      return;
    }

    // a tag
    if (e.target instanceof HTMLElement && e.target.closest("a")) {
      return;
    }

    // Open the team details drawer
    navigate({
      search: (prev) => ({ ...prev, teamId: row.original.id }),
      replace: true,
      resetScroll: false,
    });
  };

  return (
    <TableRow
      className="group h-[57px] cursor-pointer hover:bg-[#F2F1EF] hover:dark:bg-[#0f0f0f]"
      data-state={row.getIsSelected() && "selected"}
    >
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
