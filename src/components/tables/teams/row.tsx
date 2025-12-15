import { useNavigate } from "@tanstack/react-router";
import { type Row, flexRender } from "@tanstack/react-table";
import { cn } from "~/lib/utils";
import { TableCell, TableRow } from "~/components/ui/table";
import type { Team } from "./columns";

type Props = {
  row: Row<Team>;
};

export function TeamRow({ row }: Props) {
  "use no memo";
  const navigate = useNavigate();

  const handleRowClick = (cellId: string, e: React.MouseEvent) => {
    // Don't navigate if clicking on checkbox or actions column
    if (cellId === "select" || cellId === "actions") {
      return;
    }

    // Prevent event bubbling for checkbox clicks
    if (
      e.target instanceof HTMLElement &&
      e.target.closest('[role="checkbox"]')
    ) {
      return;
    }

    navigate({ to: "/teams/$teamId", params: { teamId: row.original.id } });
  };

  return (
    <TableRow
      className="group h-[57px] cursor-pointer"
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
