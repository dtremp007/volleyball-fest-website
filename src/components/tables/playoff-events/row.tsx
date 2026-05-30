import { type Row, flexRender } from "@tanstack/react-table";
import { TableCell, TableRow } from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { Route } from "~/routes/(authenticated)/seasons/$seasonId";
import type { PlayoffEventRow } from "./columns";

type Props = {
  row: Row<PlayoffEventRow>;
};

export function PlayoffEventRowItem({ row }: Props) {
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
      search: (prev) => ({
        ...prev,
        view: "playoffs",
        playoffEventId: row.original.id,
      }),
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
