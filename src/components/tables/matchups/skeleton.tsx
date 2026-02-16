import { Skeleton } from "~/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";

export function MatchupsSkeleton() {
  return (
    <div className="w-full">
      <div className="border-border overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">Matchup</TableHead>
              <TableHead className="w-[140px]">Category</TableHead>
              <TableHead className="w-[260px]">Event</TableHead>
              <TableHead className="w-[100px]">Court</TableHead>
              <TableHead className="w-[120px]">Time</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, index) => (
              <TableRow key={index.toString()}>
                <TableCell>
                  <Skeleton className="h-4 w-[220px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[90px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[180px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[70px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[80px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-[90px] rounded-full" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
