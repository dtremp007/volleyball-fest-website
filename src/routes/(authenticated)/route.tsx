import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(authenticated)")({
  component: Layout,
  beforeLoad: async ({ context }) => {
    const { user } = context.session ?? { user: null };

    if (!user) {
      throw redirect({ to: "/login" });
    }

    // re-return to update type as non-null for child routes
    return { user };
  },
});

export function Layout() {
  return <Outlet />;
}
