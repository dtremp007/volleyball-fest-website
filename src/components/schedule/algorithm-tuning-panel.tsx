import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { Slider } from "~/components/ui/slider";
import { useTRPC } from "~/trpc/react";
import {
  DEFAULT_SCHEDULING_WEIGHTS,
  type SchedulingWeights,
} from "~/validators/scheduling.validators";

const DEFAULTS_VALUE = "";

const WEIGHT_CONTROLS: {
  key: keyof SchedulingWeights;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
}[] = [
  {
    key: "femenilEarlyPerSlot",
    label: "Push femenil early",
    description: "Schedule femenil matchups in earlier time slots.",
    min: 0,
    max: 40,
    step: 1,
  },
  {
    key: "femenilCourtClustering",
    label: "Cluster femenil on the same court",
    description: "Keep femenil games together on one court.",
    min: 0,
    max: 40,
    step: 1,
  },
  {
    key: "eventCategoryBalance",
    label: "Keep category mix even across nights",
    description: "Avoid stacking one category onto a single night.",
    min: 0,
    max: 40,
    step: 1,
  },
  {
    key: "eventLoadBalance",
    label: "Spread games evenly across nights",
    description: "Balance how many games each night hosts.",
    min: 0,
    max: 40,
    step: 1,
  },
  {
    key: "farAwaySchedulingPriority",
    label: "Prioritize two games for far-away teams",
    description: "Give traveling teams two games when they come.",
    min: 0,
    max: 40,
    step: 1,
  },
  {
    key: "teamRestAdjacentEvent",
    label: "Rest far-away teams on adjacent nights",
    description: "Avoid scheduling far-away teams on consecutive nights.",
    min: 0,
    max: 40,
    step: 1,
  },
  {
    key: "categoryDistributionRun",
    label: "Avoid long same-category runs",
    description: "Break up streaks of the same category in a night.",
    min: 0,
    max: 40,
    step: 1,
  },
  {
    key: "varonilLatePerSlot",
    label: "Prefer varonil libre later",
    description: "Push varonil libre toward later slots.",
    min: 0,
    max: 40,
    step: 1,
  },
  {
    key: "maxGamesPerEvent",
    label: "Max games per team per night",
    description: "Hard cap on games a team can play in one event.",
    min: 1,
    max: 4,
    step: 1,
  },
  {
    key: "farAwayMaxGamesPerEvent",
    label: "Max games per night for far-away teams",
    description: "Cap for teams traveling from farther away.",
    min: 1,
    max: 4,
    step: 1,
  },
  {
    key: "femenilEarlyCurveExponent",
    label: "How sharply to push femenil early",
    description: "Steeper curves concentrate femenil even earlier.",
    min: 1,
    max: 4,
    step: 0.5,
  },
];

function clampWeight(value: number, min: number, max: number, step: number) {
  const clamped = Math.min(max, Math.max(min, value));
  const stepped = Math.round(clamped / step) * step;
  return Number(stepped.toFixed(step < 1 ? 1 : 0));
}

type AlgorithmTuningPanelProps = {
  seasonId: string;
  weights: SchedulingWeights;
  selectedPresetId: string | null;
  onWeightsChange: (weights: SchedulingWeights) => void;
  onSelectedPresetIdChange: (presetId: string | null) => void;
};

export function AlgorithmTuningPanel({
  seasonId,
  weights,
  selectedPresetId,
  onWeightsChange,
  onSelectedPresetIdChange,
}: AlgorithmTuningPanelProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [saveName, setSaveName] = useState("");

  const listPresetsQuery = trpc.scheduleConfig.listPresets.queryOptions({ seasonId });
  const { data: presets = [] } = useQuery(listPresetsQuery);

  const savePresetMutation = useMutation(
    trpc.scheduleConfig.savePreset.mutationOptions(),
  );
  const deletePresetMutation = useMutation(
    trpc.scheduleConfig.deletePreset.mutationOptions(),
  );

  const invalidatePresets = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.scheduleConfig.listPresets.queryKey({ seasonId }),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.scheduleConfig.get.queryKey({ seasonId }),
      }),
    ]);
  };

  const handlePresetSelect = (value: string) => {
    if (value === DEFAULTS_VALUE) {
      onSelectedPresetIdChange(null);
      onWeightsChange({ ...DEFAULT_SCHEDULING_WEIGHTS });
      return;
    }

    const preset = presets.find((item) => item.id === value);
    if (!preset) {
      return;
    }

    onSelectedPresetIdChange(preset.id);
    onWeightsChange({ ...preset.weights });
  };

  const handleWeightChange = (key: keyof SchedulingWeights, value: number) => {
    const control = WEIGHT_CONTROLS.find((item) => item.key === key);
    if (!control || !Number.isFinite(value)) {
      return;
    }

    onWeightsChange({
      ...weights,
      [key]: clampWeight(value, control.min, control.max, control.step),
    });
  };

  const handleSavePreset = async () => {
    const name = saveName.trim();
    if (!name) {
      toast.error("Enter a name for this preset");
      return;
    }

    try {
      const preset = await savePresetMutation.mutateAsync({
        seasonId,
        name,
        weights,
        setActive: true,
      });
      onSelectedPresetIdChange(preset.id);
      setSaveName("");
      await invalidatePresets();
      toast.success(`Saved preset "${preset.name}"`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save preset");
    }
  };

  const handleDeletePreset = async () => {
    if (!selectedPresetId) {
      return;
    }

    try {
      await deletePresetMutation.mutateAsync({ id: selectedPresetId });
      onSelectedPresetIdChange(null);
      onWeightsChange({ ...DEFAULT_SCHEDULING_WEIGHTS });
      await invalidatePresets();
      toast.success("Preset deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete preset");
    }
  };

  return (
    <Card>
      <Accordion type="single" collapsible>
        <AccordionItem value="algorithm-tuning" className="border-none">
          <CardHeader>
            <AccordionTrigger className="items-center py-0 text-base hover:no-underline">
              <div className="flex flex-col gap-1.5 text-left">
                <CardTitle>Algorithm tuning</CardTitle>
                <CardDescription>
                  Adjust scheduling weights or load a saved preset.
                </CardDescription>
              </div>
            </AccordionTrigger>
          </CardHeader>
          <AccordionContent>
            <CardContent className="space-y-6 pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="schedule-preset">Preset</Label>
                  <NativeSelect
                    id="schedule-preset"
                    value={selectedPresetId ?? DEFAULTS_VALUE}
                    onChange={(event) => handlePresetSelect(event.target.value)}
                  >
                    <NativeSelectOption value={DEFAULTS_VALUE}>
                      Defaults
                    </NativeSelectOption>
                    {presets.map((preset) => (
                      <NativeSelectOption key={preset.id} value={preset.id}>
                        {preset.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                {selectedPresetId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Delete preset"
                    disabled={deletePresetMutation.isPending}
                    onClick={handleDeletePreset}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="preset-name">Save as</Label>
                  <Input
                    id="preset-name"
                    value={saveName}
                    placeholder="Preset name"
                    onChange={(event) => setSaveName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSavePreset();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!saveName.trim() || savePresetMutation.isPending}
                  onClick={handleSavePreset}
                >
                  {savePresetMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>

              <div className="space-y-5">
                {WEIGHT_CONTROLS.map((control) => {
                  const value = weights[control.key];
                  const inputId = `weight-${control.key}`;

                  return (
                    <div key={control.key} className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <Label htmlFor={inputId}>{control.label}</Label>
                        <Input
                          id={inputId}
                          type="number"
                          min={control.min}
                          max={control.max}
                          step={control.step}
                          value={value}
                          onChange={(event) =>
                            handleWeightChange(control.key, Number(event.target.value))
                          }
                          className="h-8 w-20"
                        />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {control.description}
                      </p>
                      <Slider
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        value={[value]}
                        onValueChange={([next]) => {
                          if (next !== undefined) {
                            handleWeightChange(control.key, next);
                          }
                        }}
                        aria-label={control.label}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
