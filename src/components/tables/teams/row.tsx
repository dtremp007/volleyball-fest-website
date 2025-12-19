import { useNavigate, useRouter } from "@tanstack/react-router";
import { type Row, flexRender } from "@tanstack/react-table";
import { TableCell, TableRow } from "~/components/ui/table";
import { cn } from "~/lib/utils";
import type { Team } from "./columns";

type Props = {
  row: Row<Team>;
};

export function TeamRow({ row }: Props) {
  "use no memo";
  const navigate = useNavigate();
  const router = useRouter();

  const handleRowClick = (cellId: string, e: React.MouseEvent) => {
    // Don't navigate if clicking on checkbox or actions column
    if (cellId === "select" || cellId === "actions" || cellId === "name") {
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

    // return to current path
    navigate({ to: "/signup-form", search: { teamId: row.original.id, returnTo: router.history.location.href } });
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
