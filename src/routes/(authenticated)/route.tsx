import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminHeader } from "~/components/admin/admin-header";

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
  const { user } = Route.useRouteContext();
  return (
    <div className="bg-background min-h-screen">
      <a
        href="#admin-main"
        className="bg-background focus:ring-ring sr-only z-50 rounded-md px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:ring-2"
      >
        Skip to content
      </a>
      <AdminHeader user={user} />
      <main id="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
