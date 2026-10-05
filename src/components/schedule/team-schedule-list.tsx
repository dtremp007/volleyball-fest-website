import { CalendarDays, Clock, MapPin } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import type { PublicTeamGame } from "~/lib/db/queries/public-schedule";
import { formatEventDateForDisplay } from "~/lib/schedule/slot-times";
import { cn } from "~/lib/utils";
import { TeamBadge } from "./team-badge";

const COURT_LABELS: Record<string, string> = { A: "Cancha 1", B: "Cancha 2" };

export function TeamScheduleList({ games }: { games: PublicTeamGame[] }) {
  if (games.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
        <CalendarDays className="size-8 opacity-40" />
        Aún no hay partidos programados para este equipo
      </div>
    );
  }

  const nextGameId = games.find((game) => !game.played && !game.isPast)?.id;

  return (
    <ul className="divide-y">
      {games.map((game) => (
        <TeamScheduleRow key={game.id} game={game} isNext={game.id === nextGameId} />
      ))}
    </ul>
  );
}

function TeamScheduleRow({ game, isNext }: { game: PublicTeamGame; isNext: boolean }) {
  const date = formatEventDateForDisplay(game.date);
  const isPlayed = game.played || game.isPast;

  return (
    <li
      className={cn(
        "flex items-center gap-4 py-3 first:pt-0 last:pb-0",
        isPlayed && "opacity-75",
      )}
    >
      <div
        className={cn(
          "flex size-12 shrink-0 flex-col items-center justify-center rounded-lg",
          isNext ? "bg-amber-500 text-white" : "bg-amber-500/10",
        )}
      >
        <span
          className={cn(
            "text-[11px] font-medium",
            !isNext && "text-amber-600 dark:text-amber-400",
          )}
        >
          {date
            .toLocaleDateString("es-MX", { month: "short" })
            .replace(".", "")
            .toUpperCase()}
        </span>
        <span
          className={cn(
            "text-lg leading-none font-bold",
            !isNext && "text-amber-600 dark:text-amber-400",
          )}
        >
          {date.getDate()}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted-foreground shrink-0 text-sm">vs</span>
          <TeamBadge name={game.opponent.name} logoUrl={game.opponent.logoUrl} />
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="capitalize">
            {date.toLocaleDateString("es-MX", { weekday: "long" })}
          </span>
          {game.time && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {game.time}
            </span>
          )}
          {game.courtId && COURT_LABELS[game.courtId] && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {COURT_LABELS[game.courtId]}
            </span>
          )}
          {game.type === "playoff" && (
            <Badge variant="secondary" className="text-[10px]">
              Playoffs{game.label ? ` · ${game.label}` : ""}
            </Badge>
          )}
        </div>
      </div>

      <GameStatus game={game} isNext={isNext} />
    </li>
  );
}

function GameStatus({ game, isNext }: { game: PublicTeamGame; isNext: boolean }) {
  if (game.result) {
    const { setsWon, setsLost } = game.result;
    const outcome = setsWon > setsLost ? "G" : setsWon < setsLost ? "P" : "E";
    return (
      <div
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold tabular-nums",
          outcome === "G" && "bg-green-500/10 text-green-700 dark:text-green-400",
          outcome === "P" && "bg-red-500/10 text-red-700 dark:text-red-400",
          outcome === "E" && "bg-muted text-muted-foreground",
        )}
        title={outcome === "G" ? "Ganado" : outcome === "P" ? "Perdido" : "Empate"}
      >
        <span>{outcome}</span>
        <span>
          {setsWon}–{setsLost}
        </span>
      </div>
    );
  }

  if (isNext) {
    return <Badge className="shrink-0 bg-amber-500 text-white">Próximo</Badge>;
  }

  return null;
}
