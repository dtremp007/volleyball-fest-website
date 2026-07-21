import type { CategoryStandings } from "~/lib/db/queries/schedule";

import { StandingsTable } from "./standings-table";

type SeasonStandingsProps = {
  standings: CategoryStandings[];
  variant: "full" | "compact";
  /** When true, uses each category's playoffQualifierCount as the per-section limit. */
  limitToPlayoffQualifiers?: boolean;
};

export function SeasonStandings({
  standings,
  variant,
  limitToPlayoffQualifiers = false,
}: SeasonStandingsProps) {
  const spacing = variant === "full" ? "space-y-12" : "space-y-10";
  const categoryHeading =
    variant === "full" ? "text-2xl font-bold" : "mb-4 text-xl font-semibold";

  return (
    <div className={spacing}>
      {standings.map(({ category, sections, playoffQualifierCount }) => (
        <div key={category}>
          {variant === "full" ? (
            <div className="mb-6 flex items-center gap-3">
              <h2 className={categoryHeading}>{category}</h2>
            </div>
          ) : (
            <h3 className={categoryHeading}>{category}</h3>
          )}
          <div className="overflow-hidden rounded-lg border">
            <StandingsTable
              sections={sections}
              variant={variant}
              limit={limitToPlayoffQualifiers ? playoffQualifierCount : undefined}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
