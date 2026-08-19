export const GAMES_PER_TEAM_MEETINGS_CAP = 3;

export function defaultGamesPerTeam(teamCount: number) {
  if (teamCount < 2) return 0;
  return teamCount - 1;
}

export function minGamesPerTeam(teamCount: number) {
  if (teamCount < 2) return 0;
  return teamCount % 2 === 0 ? 1 : 2;
}

export function maxGamesPerTeam(teamCount: number) {
  if (teamCount < 2) return 0;
  return GAMES_PER_TEAM_MEETINGS_CAP * (teamCount - 1);
}

export function isValidGamesPerTeam(teamCount: number, gamesPerTeam: number) {
  if (teamCount < 2) return gamesPerTeam === 0;
  if (!Number.isInteger(gamesPerTeam)) return false;
  if (gamesPerTeam < minGamesPerTeam(teamCount)) return false;
  if (gamesPerTeam > maxGamesPerTeam(teamCount)) return false;
  return (teamCount * gamesPerTeam) % 2 === 0;
}

export function clampGamesPerTeam(teamCount: number, gamesPerTeam: number) {
  if (teamCount < 2) return 0;
  if (!Number.isFinite(gamesPerTeam)) {
    return defaultGamesPerTeam(teamCount);
  }

  let value = Math.trunc(gamesPerTeam);
  const min = minGamesPerTeam(teamCount);
  const max = maxGamesPerTeam(teamCount);
  value = Math.max(min, Math.min(max, value));

  if (isValidGamesPerTeam(teamCount, value)) return value;
  if (isValidGamesPerTeam(teamCount, value - 1)) return value - 1;
  if (isValidGamesPerTeam(teamCount, value + 1)) return value + 1;
  return defaultGamesPerTeam(teamCount);
}

export function nextGamesPerTeam(teamCount: number, current: number, direction: 1 | -1) {
  const min = minGamesPerTeam(teamCount);
  const max = maxGamesPerTeam(teamCount);
  let value = current + direction;
  while (value >= min && value <= max) {
    if (isValidGamesPerTeam(teamCount, value)) return value;
    value += direction;
  }
  return clampGamesPerTeam(teamCount, current);
}

export function matchupCountForGamesPerTeam(teamCount: number, gamesPerTeam: number) {
  if (teamCount < 2) return 0;
  return (teamCount * gamesPerTeam) / 2;
}

export function resolveStoredGamesPerTeam(
  teamCount: number,
  storedGamesPerTeam: number | null | undefined,
  meetingsPerPair = 1,
) {
  if (teamCount < 2) return 0;
  if (storedGamesPerTeam && storedGamesPerTeam > 0) {
    return clampGamesPerTeam(teamCount, storedGamesPerTeam);
  }
  const derived = Math.max(meetingsPerPair, 1) * Math.max(teamCount - 1, 0);
  return clampGamesPerTeam(teamCount, derived);
}

export function gamesPerTeamHelperText(teamCount: number, gamesPerTeam: number) {
  if (teamCount < 2) {
    return "Need at least two teams to generate matchups.";
  }
  const matchups = matchupCountForGamesPerTeam(teamCount, gamesPerTeam);
  const complete = defaultGamesPerTeam(teamCount);
  const matchupLabel = matchups === 1 ? "matchup" : "matchups";
  const teamLabel = teamCount === 1 ? "team" : "teams";
  const gameLabel = gamesPerTeam === 1 ? "game" : "games";
  if (gamesPerTeam < complete) {
    return `${teamCount} ${teamLabel} × ${gamesPerTeam} ${gameLabel} ÷ 2 = ${matchups} ${matchupLabel}. Some pairs will not meet.`;
  }
  if (gamesPerTeam > complete) {
    return `${teamCount} ${teamLabel} × ${gamesPerTeam} ${gameLabel} ÷ 2 = ${matchups} ${matchupLabel}. Extra games are rematches.`;
  }
  return `${teamCount} ${teamLabel} × ${gamesPerTeam} ${gameLabel} ÷ 2 = ${matchups} ${matchupLabel}.`;
}
