export const USER_ROLES = ["admin", "scorekeeper"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function parseUserRole(role: unknown): UserRole {
  return role === "scorekeeper" ? "scorekeeper" : "admin";
}

export function isAdminRole(role: unknown): boolean {
  return parseUserRole(role) === "admin";
}
