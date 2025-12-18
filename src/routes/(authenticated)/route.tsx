import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { HorizontalMenuLayout, Menu } from "~/components/horizontal-menu";
import { authQueryOptions } from "~/lib/auth/queries";

export const Route = createFileRoute("/(authenticated)")({
  component: Layout,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData({
      ...authQueryOptions(),
      revalidateIfStale: true,
    });
    if (!user) {
      throw redirect({ to: "/login" });
    }

    // re-return to update type as non-null for child routes
    return { user };
  },
});

export function Layout() {
  return (
    <div className="w-full min-h-screen">
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
    </div>
  );
}
