import { v4 as uuidv4 } from "uuid";
import type { ScheduleEvent } from "./types";

export const AUTOSAVE_INTERVAL = 5000; // 5 seconds

export function teamsOverlap(
  teamAId: string,
  teamBId: string,
  otherTeamAId: string,
  otherTeamBId: string,
) {
  return (
    teamAId === otherTeamAId ||
    teamAId === otherTeamBId ||
    teamBId === otherTeamAId ||
    teamBId === otherTeamBId
  );
}

/**
 * For a matchup at `index` on `courtId`, check if the other court
 * has a matchup at the same index that shares a team.
 * Returns the names of conflicting teams, or an empty array.
 */
export function getConflictingTeams(
  event: ScheduleEvent,
  courtId: "A" | "B",
  index: number,
): string[] {
  const otherCourt = event.courts.find((c) => c.id !== courtId);
  if (!otherCourt) return [];

  const thisCourt = event.courts.find((c) => c.id === courtId);
  if (!thisCourt) return [];

  const thisMatchup = thisCourt.matchups[index];
  const otherMatchup = otherCourt.matchups[index];
  if (!thisMatchup || !otherMatchup) return [];

  const conflicting: string[] = [];
  const thisTeamIds = [thisMatchup.teamA.id, thisMatchup.teamB.id];
  const otherTeams = [otherMatchup.teamA, otherMatchup.teamB];

  for (const team of otherTeams) {
    if (thisTeamIds.includes(team.id)) {
      conflicting.push(team.name);
    }
  }

  return conflicting;
}

export function createNewEvent(name: string, date: string): ScheduleEvent {
  return {
    id: uuidv4(),
    name,
    date,
    courts: [
      { id: "A", matchups: [] },
      { id: "B", matchups: [] },
    ],
  };
}
