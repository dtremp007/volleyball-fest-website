import { Check, CircleAlert, Loader2, Wrench } from "lucide-react";
import { cn } from "~/lib/utils";

const TOOL_LABELS: Record<string, string> = {
  get_season_overview: "Read season",
  get_schedule_day: "Read game night",
  create_matchups: "Create matchups",
  fill_missing_round_robin: "Fill missing matchups",
  generate_schedule: "Generate schedule",
  place_matchup: "Place matchup",
  reorder_event: "Reorder game night",
  delete_unscheduled_matchups: "Delete unscheduled matchups",
};

function toolNameFromType(type: string) {
  return type.startsWith("tool-") ? type.slice("tool-".length) : type;
}

function summarizeOutput(output: unknown) {
  if (!output || typeof output !== "object") return null;
  const record = output as Record<string, unknown>;
  if (record.ok === false && typeof record.error === "string") {
    return record.error;
  }
  if (typeof record.createdCount === "number") {
    return `Created ${record.createdCount}`;
  }
  if (typeof record.deletedCount === "number") {
    return `Deleted ${record.deletedCount}`;
  }
  if (typeof record.scheduledCount === "number") {
    return `Scheduled ${record.scheduledCount}, left ${typeof record.unscheduledCount === "number" ? record.unscheduledCount : "?"} unscheduled`;
  }
  if (typeof record.updatedCount === "number") {
    return `Updated ${record.updatedCount}`;
  }
  if (record.event && typeof record.event === "object") {
    const event = record.event as { name?: string };
    return event.name ? `Loaded ${event.name}` : "Loaded game night";
  }
  if (record.season && typeof record.season === "object") {
    const season = record.season as { name?: string };
    return season.name ? `Loaded ${season.name}` : "Loaded season";
  }
  return null;
}

export function AssistantToolPart({
  type,
  state,
  output,
  errorText,
}: {
  type: string;
  state: string;
  output?: unknown;
  errorText?: string;
}) {
  const name = toolNameFromType(type);
  const label = TOOL_LABELS[name] ?? name.replaceAll("_", " ");
  const isPending = state === "input-streaming" || state === "input-available";
  const isError = state === "output-error" || errorText != null;
  const summary = summarizeOutput(output);

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
        isError
          ? "border-destructive/40 bg-destructive/5 text-destructive"
          : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      {isPending ? (
        <Loader2 className="mt-0.5 size-3.5 animate-spin" />
      ) : isError ? (
        <CircleAlert className="mt-0.5 size-3.5" />
      ) : (
        <Check className="mt-0.5 size-3.5" />
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 font-medium">
          <Wrench className="size-3" />
          <span>{label}</span>
        </div>
        {isPending ? <p>Working…</p> : null}
        {isError ? <p>{errorText ?? summary ?? "Tool failed"}</p> : null}
        {!isPending && !isError && summary ? <p>{summary}</p> : null}
      </div>
    </div>
  );
}
