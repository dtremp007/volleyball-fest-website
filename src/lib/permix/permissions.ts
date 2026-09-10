import type { UserRole } from "~/lib/auth/roles";

export type PermissionsDefinition = {
  season: ["read", "create", "update", "delete", "manageState"];
  team: ["read", "update"];
  score: ["update"];
  schedule: ["build"];
  playoff: ["read", "build"];
  settings: ["manage"];
  user: ["read", "create", "update"];
};

export const deniedRules = {
  season: {
    read: false,
    create: false,
    update: false,
    delete: false,
    manageState: false,
  },
  team: { read: false, update: false },
  score: { update: false },
  schedule: { build: false },
  playoff: { read: false, build: false },
  settings: { manage: false },
  user: { read: false, create: false, update: false },
} as const;

export const adminRules = {
  season: {
    read: true,
    create: true,
    update: true,
    delete: true,
    manageState: true,
  },
  team: { read: true, update: true },
  score: { update: true },
  schedule: { build: true },
  playoff: { read: true, build: true },
  settings: { manage: true },
  user: { read: true, create: true, update: true },
} as const;

export const scorekeeperRules = {
  season: {
    read: true,
    create: false,
    update: false,
    delete: false,
    manageState: false,
  },
  team: { read: true, update: false },
  score: { update: true },
  schedule: { build: false },
  playoff: { read: false, build: false },
  settings: { manage: false },
  user: { read: false, create: false, update: false },
} as const;

export function rulesForRole(role: UserRole | null | undefined) {
  if (role === "admin") return adminRules;
  if (role === "scorekeeper") return scorekeeperRules;
  return deniedRules;
}
