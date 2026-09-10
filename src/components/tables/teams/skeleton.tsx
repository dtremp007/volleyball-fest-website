import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { usePermissions } from "~/hooks/use-permissions";

const SKELETON_ROW_IDS = [
  "sk-1",
  "sk-2",
  "sk-3",
  "sk-4",
  "sk-5",
  "sk-6",
  "sk-7",
  "sk-8",
  "sk-9",
  "sk-10",
] as const;

export function TeamsSkeleton() {
  const { check } = usePermissions();
  const canUpdate = check("team.update");

  return (
    <div className="w-full">
      <div className="border-border overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="border-r-0 border-l-0">
            <TableRow className="hover:bg-transparent">
              {canUpdate && (
                <TableHead className="bg-background w-[50px] min-w-[50px]">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
              )}
              <TableHead className="bg-background w-[200px] min-w-[200px] border-r">
                Team Name
              </TableHead>
              <TableHead className="w-[150px]">Category</TableHead>
              <TableHead className="w-[180px]">Captain</TableHead>
              <TableHead className="w-[180px]">Captain Number</TableHead>
              <TableHead className="w-[80px]">Has Paid</TableHead>
              <TableHead className="w-[80px]">Far Away</TableHead>
              <TableHead className="w-[180px]">Coming From</TableHead>
              {canUpdate && (
                <TableHead className="bg-background w-[50px] border-l">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="border-r-0 border-l-0">
            {SKELETON_ROW_IDS.map((rowId) => (
              <TableRow key={rowId} className="h-[57px]">
                {canUpdate && (
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                )}
                <TableCell className="w-[200px] min-w-[200px] border-r">
                  <div className="flex items-center gap-2">
                    <Skeleton className="size-6 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-[120px]" />
                  </div>
                </TableCell>
                <TableCell className="w-[150px] min-w-[150px]">
                  <Skeleton className="h-5 w-[80px] rounded-full" />
                </TableCell>
                <TableCell className="w-[180px] min-w-[180px]">
                  <Skeleton className="h-4 w-[120px]" />
                </TableCell>
                <TableCell className="w-[180px] min-w-[180px]">
                  <Skeleton className="h-4 w-[100px]" />
                </TableCell>
                <TableCell className="w-[80px] min-w-[80px]">
                  <Skeleton className="h-4 w-4" />
                </TableCell>
                <TableCell className="w-[80px] min-w-[80px]">
                  <Skeleton className="h-4 w-4" />
                </TableCell>
                <TableCell className="w-[180px] min-w-[180px]">
                  <Skeleton className="h-4 w-[80px]" />
                </TableCell>
                {canUpdate && (
                  <TableCell className="border-l text-right">
                    <Skeleton className="ml-auto h-8 w-8" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={canUpdate ? 8 : 6}>Total teams</TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-4 w-8" />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
