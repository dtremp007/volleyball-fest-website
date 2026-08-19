import {
  clampGamesPerTeam,
  defaultGamesPerTeam,
  resolveStoredGamesPerTeam,
} from "~/lib/schedule/games-per-team";
import { GROUP_COUNT_MAX, GROUP_NAMES } from "~/validators/group.validators";

export type ConfigureTeam = {
  id: string;
  name: string;
  logoUrl: string;
  category: { id: string; name: string };
  groupId?: string | null;
};

export type GroupAssignment = {
  [teamId: string]: number;
};

export type CategoryConfigState = {
  groupCount: number;
  assignments: GroupAssignment;
  gamesPerTeamByGroup: number[];
};

export function distributeTeams(
  teams: ConfigureTeam[],
  groupCount: number,
): GroupAssignment {
  const assignments: GroupAssignment = {};
  teams.forEach((team, index) => {
    assignments[team.id] = index % groupCount;
  });
  return assignments;
}

export function teamsInGroup(
  teams: ConfigureTeam[],
  assignments: GroupAssignment,
  groupIndex: number,
) {
  return teams.filter((team) => (assignments[team.id] ?? 0) === groupIndex);
}

function syncGamesPerTeam(
  previous: number[],
  previousCounts: number[],
  nextCounts: number[],
) {
  return nextCounts.map((teamCount, index) => {
    const previousCount = previousCounts[index] ?? 0;
    const previousValue = previous[index];
    if (previousValue == null || previousValue === defaultGamesPerTeam(previousCount)) {
      return defaultGamesPerTeam(teamCount);
    }
    return clampGamesPerTeam(teamCount, previousValue);
  });
}

export function groupTeamCounts(
  teams: ConfigureTeam[],
  assignments: GroupAssignment,
  groupCount: number,
) {
  const counts = Array.from({ length: groupCount }, () => 0);
  teams.forEach((team) => {
    const groupIndex = assignments[team.id] ?? 0;
    if (counts[groupIndex] != null) {
      counts[groupIndex] += 1;
    }
  });
  return counts;
}

export function withGroupCount(
  state: CategoryConfigState,
  teams: ConfigureTeam[],
  groupCount: number,
): CategoryConfigState {
  const nextCount = Math.max(1, Math.min(GROUP_COUNT_MAX, groupCount));
  const previousCounts = groupTeamCounts(teams, state.assignments, state.groupCount);
  const assignments = distributeTeams(teams, nextCount);
  const nextCounts = groupTeamCounts(teams, assignments, nextCount);
  return {
    groupCount: nextCount,
    assignments,
    gamesPerTeamByGroup: syncGamesPerTeam(
      state.gamesPerTeamByGroup,
      previousCounts,
      nextCounts,
    ),
  };
}

export function withTeamAssignment(
  state: CategoryConfigState,
  teams: ConfigureTeam[],
  teamId: string,
  groupIndex: number,
): CategoryConfigState {
  const previousCounts = groupTeamCounts(teams, state.assignments, state.groupCount);
  const assignments = { ...state.assignments, [teamId]: groupIndex };
  const nextCounts = groupTeamCounts(teams, assignments, state.groupCount);
  return {
    ...state,
    assignments,
    gamesPerTeamByGroup: syncGamesPerTeam(
      state.gamesPerTeamByGroup,
      previousCounts,
      nextCounts,
    ),
  };
}

export function withGamesPerTeam(
  state: CategoryConfigState,
  groupIndex: number,
  gamesPerTeam: number,
  teamCount: number,
): CategoryConfigState {
  const gamesPerTeamByGroup = [...state.gamesPerTeamByGroup];
  gamesPerTeamByGroup[groupIndex] = clampGamesPerTeam(teamCount, gamesPerTeam);
  return { ...state, gamesPerTeamByGroup };
}

export function buildInitialCategoryState(
  teams: ConfigureTeam[],
  groups: { id: string; name: string; gamesPerTeam: number }[],
  meetingsPerPair: number,
): CategoryConfigState {
  if (groups.length === 0) {
    const assignments = distributeTeams(teams, 1);
    return {
      groupCount: 1,
      assignments,
      gamesPerTeamByGroup: [resolveStoredGamesPerTeam(teams.length, 0, meetingsPerPair)],
    };
  }

  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));
  const groupIdToIndex = new Map(sortedGroups.map((group, index) => [group.id, index]));
  const assignments: GroupAssignment = {};
  teams.forEach((team) => {
    assignments[team.id] =
      team.groupId != null ? (groupIdToIndex.get(team.groupId) ?? 0) : 0;
  });

  const gamesPerTeamByGroup = sortedGroups.map((group, index) => {
    const teamCount = teams.filter(
      (team) => (assignments[team.id] ?? 0) === index,
    ).length;
    return resolveStoredGamesPerTeam(teamCount, group.gamesPerTeam, meetingsPerPair);
  });

  return {
    groupCount: sortedGroups.length,
    assignments,
    gamesPerTeamByGroup,
  };
}

export { GROUP_NAMES };
