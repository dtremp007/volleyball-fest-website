import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Footer } from "~/components/footer";
import { Header } from "~/components/header";
import authClient from "~/lib/auth/auth-client";

export const Route = createFileRoute("/(public)")({
  component: PublicLayout,
});

function PublicLayout() {
  const { data: session } = authClient.useSession();

  return (
    <>
      <Header
        links={[
          { label: "Inicio", to: "/" },
          { label: "Equipos", to: "/equipos" },
          { label: "Posiciones", to: "/posiciones" },
          { label: "Inscribir equipo", to: "/signup-form" },
          ...(session?.user
            ? [
                {
                  label: "Dashboard",
                  to: "/admin",
                },
              ]
            : []),
        ]}
      />
      <main className="min-h-screen flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
