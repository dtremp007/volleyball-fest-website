import { useRouteContext } from "@tanstack/react-router";
import { usePermix } from "permix/react";

export function usePermissions() {
  const { permix } = useRouteContext({ from: "__root__" });
  return usePermix(permix);
}
