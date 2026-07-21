import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)/dashboard/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
});
