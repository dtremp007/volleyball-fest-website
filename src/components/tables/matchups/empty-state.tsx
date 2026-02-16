import { Swords } from "lucide-react";

export function EmptyMatchupsState() {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed py-16">
      <div className="flex flex-col items-center text-center">
        <Swords className="text-muted-foreground/50 mb-3 size-10" />
        <h3 className="font-medium">No matchups found</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Generate matchups first to see this table.
        </p>
      </div>
    </div>
  );
}
