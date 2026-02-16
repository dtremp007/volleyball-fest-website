import { Calendar } from "lucide-react";

export function EmptyEventsState() {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed py-16">
      <div className="flex flex-col items-center text-center">
        <Calendar className="text-muted-foreground/50 mb-3 size-10" />
        <h3 className="font-medium">No events found</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Create and schedule events to see them listed here.
        </p>
      </div>
    </div>
  );
}
