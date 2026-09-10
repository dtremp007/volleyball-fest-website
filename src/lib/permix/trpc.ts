import { createPermix } from "permix/trpc";
import type { PermissionsDefinition } from "~/lib/permix/permissions";

export const permix = createPermix<PermissionsDefinition>().contextKey("permissions");
