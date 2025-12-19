import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { HorizontalMenuLayout, Menu } from "~/components/horizontal-menu";

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
  return (
    <>
      <HorizontalMenuLayout>
        <Menu
          links={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Teams", to: "/teams" },
            { label: "Schedule Builder", to: "/schedule-builder" },
            { label: "Settings", to: "/settings" },
          ]}
        />
      </HorizontalMenuLayout>
      <Outlet />
    </>
  );
}
