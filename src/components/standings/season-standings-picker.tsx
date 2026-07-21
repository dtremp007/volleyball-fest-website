import { useNavigate } from "@tanstack/react-router";

import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";

export type StandingsSeasonOption = {
  id: string;
  name: string;
  state?: string | null;
};

type SeasonStandingsPickerProps = {
  seasons: StandingsSeasonOption[];
  selectedSeasonId: string;
};

export function SeasonStandingsPicker({
  seasons,
  selectedSeasonId,
}: SeasonStandingsPickerProps) {
  const navigate = useNavigate();

  if (seasons.length <= 1) {
    return null;
  }

  return (
    <div className="flex max-w-xs flex-col gap-1.5">
      <label htmlFor="standings-season" className="text-sm text-zinc-400">
        Temporada
      </label>
      <NativeSelect
        id="standings-season"
        value={selectedSeasonId}
        onChange={(event) => {
          void navigate({
            to: "/posiciones/$seasonId",
            params: { seasonId: event.target.value },
          });
        }}
      >
        {seasons.map((season) => (
          <NativeSelectOption key={season.id} value={season.id}>
            {season.name}
            {season.state === "active" ? " (actual)" : ""}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
