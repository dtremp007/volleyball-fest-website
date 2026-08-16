export function unorderedTeamPairKey(teamAId: string, teamBId: string) {
  return teamAId < teamBId ? `${teamAId}:${teamBId}` : `${teamBId}:${teamAId}`;
}
