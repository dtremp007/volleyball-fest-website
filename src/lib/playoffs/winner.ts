export type PlayoffWinnerSlot = {
  teamId: string | null;
};

export type PlayoffPointRow = {
  teamId: string;
  set: number;
  points: number;
};

export type PlayoffWinnerResult = {
  winnerTeamId: string;
  loserTeamId: string;
  teamSetsWon: Record<string, number>;
};

export function calculatePlayoffWinner(params: {
  bestOf: number;
  teams: PlayoffWinnerSlot[];
  points: PlayoffPointRow[];
}): PlayoffWinnerResult | null {
  const teamIds = params.teams
    .map((team) => team.teamId)
    .filter((teamId): teamId is string => Boolean(teamId));

  if (teamIds.length !== 2) return null;

  const [teamAId, teamBId] = teamIds;
  if (!teamAId || !teamBId || teamAId === teamBId) return null;

  const pointsBySet = new Map<number, Map<string, number>>();
  for (const point of params.points) {
    if (point.teamId !== teamAId && point.teamId !== teamBId) continue;

    const setPoints = pointsBySet.get(point.set) ?? new Map<string, number>();
    setPoints.set(point.teamId, point.points);
    pointsBySet.set(point.set, setPoints);
  }

  const teamSetsWon: Record<string, number> = {
    [teamAId]: 0,
    [teamBId]: 0,
  };

  const orderedSets = [...pointsBySet.entries()].sort(([a], [b]) => a - b);
  for (const [, setPoints] of orderedSets) {
    const teamAPoints = setPoints.get(teamAId);
    const teamBPoints = setPoints.get(teamBId);
    if (teamAPoints === undefined || teamBPoints === undefined) continue;
    if (teamAPoints === teamBPoints) continue;

    const setWinnerId = teamAPoints > teamBPoints ? teamAId : teamBId;
    teamSetsWon[setWinnerId] += 1;
  }

  const setsNeeded = Math.floor(params.bestOf / 2) + 1;
  if (teamSetsWon[teamAId] >= setsNeeded) {
    return { winnerTeamId: teamAId, loserTeamId: teamBId, teamSetsWon };
  }
  if (teamSetsWon[teamBId] >= setsNeeded) {
    return { winnerTeamId: teamBId, loserTeamId: teamAId, teamSetsWon };
  }

  return null;
}
