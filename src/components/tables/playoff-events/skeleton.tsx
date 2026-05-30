import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

export function PlayoffEventsSkeleton() {
  return (
    <div className="w-full">
      <div className="border-border overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">Date</TableHead>
              <TableHead className="w-[120px]">Games</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, index) => (
              <TableRow key={index.toString()}>
                <TableCell>
                  <Skeleton className="h-4 w-[160px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-[50px] rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="ml-auto h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
