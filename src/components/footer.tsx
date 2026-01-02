import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

import { Separator } from "~/components/ui/separator";

const socialLinks = [
  {
    name: "Facebook",
    url: "https://www.facebook.com/volleyball.fest15/",
    icon: "facebook",
  },
  {
    name: "Instagram",
    url: "https://www.instagram.com/volleyball.fest/",
    icon: "instagram",
  },
];

export function Footer() {
  return (
    <footer className="border-t bg-zinc-50 dark:bg-zinc-900/50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">
              Volleyball <span className="text-[#C20A12]">Fest</span>
            </h3>
            <div className="text-muted-foreground flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span>
                Gimnasio de Escuela Álvaro Obregón
                <br />
                Cuauhtémoc, Mexico
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold">Enlaces</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link
                to="/"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Inicio
              </Link>
              <a
                href="/equipos"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Equipos
              </a>
              <Link
                to="/signup-form"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Inscribir equipo
              </Link>
            </nav>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h4 className="font-semibold">Síguenos</h4>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.icon}
                  href={social.url}
                  className="text-zinc-300 transition-colors hover:text-white"
                  aria-label={`Follow us on ${social.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    height="24"
                    width="24"
                    src={`https://cdn.simpleicons.org/${social.icon}/white`}
                    alt={social.name}
                  />
                </a>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="text-muted-foreground flex flex-col items-center justify-between gap-4 text-sm md:flex-row">
          <p>
            © {new Date().getFullYear()} Volleyball Fest. Todos los derechos reservados.
          </p>
          <p>Hecho con pasión por el voleibol</p>
        </div>
      </div>
    </footer>
  );
}
