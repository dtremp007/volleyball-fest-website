import { type Row, flexRender } from "@tanstack/react-table";
import { TableCell, TableRow } from "~/components/ui/table";
import { cn } from "~/lib/utils";
import type { MatchupRow } from "./columns";

type Props = {
  row: Row<MatchupRow>;
};

export function MatchupRowItem({ row }: Props) {
  const isSetRow = row.depth === 1;

  return (
    <TableRow
      className={cn(
        "group",
        isSetRow
          ? "h-10 bg-transparent hover:bg-muted/20"
          : "h-[57px] hover:bg-[#F2F1EF] hover:dark:bg-[#0f0f0f]",
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={cn(
            cell.column.columnDef.meta?.className,
            isSetRow && "text-sm",
            isSetRow && cell.column.id === "set" && "pl-8",
          )}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  );
}
