export const LAST_SEASON_STORAGE_KEY = "volleyball-fest:last-season-id";

const supportedSeasonSuffixes = new Set([
  "",
  "/teams",
  "/scorecard",
  "/build",
  "/configure",
  "/generate",
  "/playoffs",
  "/playoffs/build",
  "/playoffs/scorecard",
  "/settings",
]);

function isSupportedSeasonSuffix(suffix: string) {
  return supportedSeasonSuffixes.has(suffix) || suffix.startsWith("/configure/");
}

export function getSeasonSwitchTarget(
  pathname: string,
  currentSeasonId: string,
  targetSeasonId: string,
) {
  const prefix = `/seasons/${currentSeasonId}`;
  const suffix = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";
  const safeSuffix = isSupportedSeasonSuffix(suffix) ? suffix : "";
  return `/seasons/${targetSeasonId}${safeSuffix}`;
}

export function selectAdminEntrySeason<
  T extends { id: string; state: string | null; startDate: string },
>(seasons: T[], savedSeasonId?: string | null) {
  if (savedSeasonId) {
    const saved = seasons.find((season) => season.id === savedSeasonId);
    if (saved) return saved;
  }
  return (
    [...seasons]
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .find((season) => season.state !== "completed") ??
    [...seasons].sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ??
    null
  );
}
