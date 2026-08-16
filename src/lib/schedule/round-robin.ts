import {
  MEETINGS_PER_PAIR_MAX,
  MEETINGS_PER_PAIR_MIN,
} from "~/validators/category.validators";

export function clampMeetingsPerPair(meetingsPerPair: number) {
  if (!Number.isFinite(meetingsPerPair)) {
    return MEETINGS_PER_PAIR_MIN;
  }
  return Math.max(
    MEETINGS_PER_PAIR_MIN,
    Math.min(MEETINGS_PER_PAIR_MAX, Math.trunc(meetingsPerPair)),
  );
}

export function generateRoundRobinPairs(
  teamIds: string[],
  meetingsPerPair: number,
): Array<{ teamAId: string; teamBId: string }> {
  const meetings = clampMeetingsPerPair(meetingsPerPair);
  const pairs: Array<{ teamAId: string; teamBId: string }> = [];
  if (teamIds.length < 2) return pairs;

  for (let meeting = 0; meeting < meetings; meeting++) {
    const swap = meeting % 2 === 1;
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        const teamAId = teamIds[i];
        const teamBId = teamIds[j];
        if (!teamAId || !teamBId) continue;
        pairs.push({
          teamAId: swap ? teamBId : teamAId,
          teamBId: swap ? teamAId : teamBId,
        });
      }
    }
  }

  return pairs;
}
