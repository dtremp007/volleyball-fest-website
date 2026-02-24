import { type Row, flexRender } from "@tanstack/react-table";
import { TableCell, TableRow } from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { Route } from "~/routes/(authenticated)/seasons/$seasonId";
import type { MatchupRow } from "./columns";

type Props = {
  row: Row<MatchupRow>;
};

export function MatchupRowItem({ row }: Props) {
  const navigate = Route.useNavigate();

  const handleRowClick = (e: React.MouseEvent) => {
    if (
      e.target instanceof HTMLElement &&
      (e.target.closest("a") || e.target.closest("button"))
    ) {
      return;
    }

    navigate({
      search: (prev) => ({
        ...prev,
        view: "matchups",
        eventId: undefined,
        matchupId: row.original.id,
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
          onClick={handleRowClick}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}
