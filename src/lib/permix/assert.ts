import { redirect } from "@tanstack/react-router";
import type { Permix, RulesPaths } from "permix";
import type { PermissionsDefinition } from "~/lib/permix/permissions";

export function assertPermission(
  permix: Permix<PermissionsDefinition>,
  path: RulesPaths<PermissionsDefinition>,
) {
  if (!permix.check(path)) {
    throw redirect({ to: "/admin" });
  }
}
