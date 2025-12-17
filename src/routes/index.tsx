import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Calendar, Users, Trophy, ChevronRight } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const leagues = [
  {
    id: "women-primera",
    title: "Mujeres Primera Fuerza",
    description: "Liga competitiva de alto nivel para equipos femeninos experimentados",
    icon: Trophy,
    category: "Mujeres",
  },
  {
    id: "women-segunda",
    title: "Mujeres Segunda Fuerza",
    description: "Liga de desarrollo para equipos femeninos en crecimiento",
    icon: Users,
    category: "Mujeres",
  },
  {
    id: "men-primera",
    title: "Varonil Primera Fuerza",
    description: "Liga competitiva de alto nivel para equipos varoniles experimentados",
    icon: Trophy,
    category: "Varonil",
  },
  {
    id: "men-segunda",
    title: "Varonil Segunda Fuerza",
    description: "Liga de desarrollo para equipos varoniles en crecimiento",
    icon: Users,
    category: "Varonil",
  },
];

const seasons = [
  {
    id: "spring",
    name: "Primavera",
    months: "Febrero - Mayo",
    description: "Temporada de primavera con partidos cada sábado",
  },
  {
    id: "fall",
    name: "Otoño",
    months: "Septiembre - Diciembre",
    description: "Temporada de otoño con playoffs en diciembre",
  },
  {
    id: "flash",
    name: "Torneo Relámpago",
    months: "Mayo",
    description: "Torneo especial de un día con formato eliminatorio",
  },
];

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero.jpeg')" }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <Badge
            variant="outline"
            className="mb-6 border-amber-400/50 bg-amber-400/10 text-amber-300 backdrop-blur-sm"
          >
            Inscripciones Abiertas
          </Badge>

          <h1 className="mb-6 font-serif text-5xl font-bold tracking-tight text-white md:text-7xl lg:text-8xl">
            Volleyball
            <span className="block bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
              Fest
            </span>
          </h1>

          <p className="mx-auto mb-4 max-w-2xl text-lg text-zinc-300 md:text-xl">
            La liga de voleibol más emocionante de Cuauhtémoc
          </p>

          <div className="mb-10 flex items-center justify-center gap-2 text-zinc-400">
            <MapPin className="size-5 text-amber-400" />
            <span className="text-sm md:text-base">
              Gimnasio de Escuela Álvaro Obregón, Cuauhtémoc, Mexico
            </span>
          </div>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="bg-amber-500 px-8 text-base font-semibold text-black hover:bg-amber-400"
            >
              <Link to="/signup-form">
                Inscribe tu equipo
                <ChevronRight className="size-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-zinc-600 bg-transparent text-white hover:bg-white/10"
            >
              <a href="#leagues">
                Ver ligas
              </a>
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="h-10 w-6 rounded-full border-2 border-zinc-500 p-1">
            <div className="mx-auto h-2 w-1 rounded-full bg-zinc-400" />
          </div>
        </div>
      </section>

      {/* Seasons Section */}
      <section className="bg-zinc-50 py-20 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <Badge variant="secondary" className="mb-4">
              <Calendar className="mr-1 size-3" />
              Calendario
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Temporadas
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Dos temporadas regulares al año más un emocionante torneo relámpago en mayo
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {seasons.map((season, index) => (
              <Card
                key={season.id}
                className="group relative overflow-hidden transition-all hover:shadow-lg"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={
                        season.id === "flash"
                          ? "border-orange-500/50 text-orange-600 dark:text-orange-400"
                          : "border-amber-500/50 text-amber-600 dark:text-amber-400"
                      }
                    >
                      {season.months}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{season.name}</CardTitle>
                  <CardDescription>{season.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Leagues Section */}
      <section id="leagues" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <Badge variant="secondary" className="mb-4">
              <Trophy className="mr-1 size-3" />
              Competencia
            </Badge>
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Nuestras Ligas
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Cuatro divisiones para todos los niveles de competencia
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {leagues.map((league, index) => (
              <Card
                key={league.id}
                className="group relative overflow-hidden transition-all hover:shadow-lg"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
                <CardHeader>
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
                      <league.icon className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {league.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{league.title}</CardTitle>
                  <CardDescription>{league.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Separator className="mb-4" />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Partidos los sábados</span>
                    <span className="font-medium text-foreground">8+ equipos</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative overflow-hidden bg-zinc-900 py-20 dark:bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            ¿Listo para jugar?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-zinc-400">
            Inscribe a tu equipo hoy y forma parte de la comunidad de voleibol más activa de Cuauhtémoc
          </p>
          <Button
            asChild
            size="lg"
            className="bg-amber-500 px-10 text-base font-semibold text-black hover:bg-amber-400"
          >
            <Link to="/signup-form">
              Inscribe tu equipo ahora
              <ChevronRight className="size-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
