import { cn } from "~/lib/utils";

export function TeamBadge({
  name,
  logoUrl,
  className,
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-1.5", className)}>
      <div className="bg-muted size-6 shrink-0 overflow-hidden rounded">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="size-full object-cover" />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center text-xs">
            {name[0]}
          </div>
        )}
      </div>
      <span className="truncate text-sm font-medium">{name}</span>
    </div>
  );
}
