import { Link } from "@tanstack/react-router";
import { ChevronRight, History } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export type PreviousSeasonLink = {
  id: string;
  name: string;
};

type PreviousSeasonsSectionProps = {
  seasons: PreviousSeasonLink[];
};

export function PreviousSeasonsSection({ seasons }: PreviousSeasonsSectionProps) {
  if (seasons.length === 0) {
    return null;
  }

  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-4">
            <History className="mr-1 size-3" />
            Historial
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Temporadas anteriores
          </h2>
          <p className="mx-auto max-w-xl text-zinc-400">
            Consulta las tablas de posiciones de temporadas pasadas.
          </p>
        </div>

        <ul className="mx-auto flex max-w-lg flex-col gap-3">
          {seasons.map((season) => (
            <li key={season.id}>
              <Button
                asChild
                variant="outline"
                className="h-auto w-full justify-between py-3"
              >
                <Link to="/posiciones/$seasonId" params={{ seasonId: season.id }}>
                  <span className="truncate font-medium">{season.name}</span>
                  <span className="text-muted-foreground flex items-center gap-1 text-sm">
                    Ver posiciones
                    <ChevronRight className="size-4" />
                  </span>
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
