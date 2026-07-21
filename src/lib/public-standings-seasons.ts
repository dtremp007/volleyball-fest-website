type SeasonLike = {
  id: string;
  name: string;
  state: string | null;
  startDate: string;
  endDate: string;
};

type PublicSeasonContextLike = {
  competitionSeason: SeasonLike | null;
  completedSeasons: SeasonLike[];
};

/** Seasons that can appear on the public posiciones pages (active + completed). */
export function getPosicionesSeasonOptions(context: PublicSeasonContextLike) {
  const options: SeasonLike[] = [];

  if (context.competitionSeason?.state === "active") {
    options.push(context.competitionSeason);
  }

  for (const season of context.completedSeasons) {
    if (!options.some((option) => option.id === season.id)) {
      options.push(season);
    }
  }

  return options;
}

/** Default season for `/posiciones` redirect: active, else newest completed. */
export function selectDefaultPosicionesSeasonId(
  context: PublicSeasonContextLike,
): string | null {
  if (context.competitionSeason?.state === "active") {
    return context.competitionSeason.id;
  }

  return context.completedSeasons[0]?.id ?? null;
}
