import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { useTRPC } from "~/trpc/react";
import type { SeasonState } from "~/validators/season.validators";

const stateLabels: Record<SeasonState, string> = {
  draft: "Draft",
  signup_open: "Sign-up open",
  signup_closed: "Sign-up closed",
  active: "Active",
  completed: "Completed",
};

const validStateTransitions: Record<SeasonState, SeasonState[]> = {
  draft: ["signup_open"],
  signup_open: ["signup_closed", "active"],
  signup_closed: ["signup_open", "active"],
  active: ["completed"],
  completed: [],
};

const allStates = Object.keys(stateLabels) as SeasonState[];

type Props = {
  seasonId: string;
  currentState: SeasonState;
};

export function SeasonStatusDialog({ seasonId, currentState }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedState, setSelectedState] = useState<SeasonState>(currentState);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const allowedNext = validStateTransitions[currentState] ?? [];
  const selectableStates = new Set<SeasonState>([currentState, ...allowedNext]);

  useEffect(() => {
    if (open) setSelectedState(currentState);
  }, [open, currentState]);

  const updateStateMutation = useMutation(
    trpc.season.updateState.mutationOptions({
      onSuccess: async () => {
        toast.success("Season status updated");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpc.season.getAll.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.season.getById.queryKey() }),
        ]);
        setOpen(false);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const canSave = selectedState !== currentState && selectableStates.has(selectedState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="focus-visible:ring-ring hidden rounded-full focus-visible:ring-2 focus-visible:outline-none sm:inline-flex"
          aria-label={`Change season status (currently ${stateLabels[currentState]})`}
        >
          <Badge
            variant="secondary"
            className="hover:bg-secondary/80 cursor-pointer transition-colors"
          >
            {stateLabels[currentState]}
          </Badge>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Season status</DialogTitle>
          <DialogDescription>
            Choose the next status for this season. Only valid transitions are available.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup
          value={selectedState}
          onValueChange={(value) => setSelectedState(value as SeasonState)}
          className="gap-3"
        >
          {allStates.map((state) => {
            const id = `season-state-${state}`;
            const disabled = !selectableStates.has(state);
            return (
              <div key={state} className="flex items-center gap-3">
                <RadioGroupItem value={state} id={id} disabled={disabled} />
                <Label
                  htmlFor={id}
                  className={disabled ? "text-muted-foreground" : undefined}
                >
                  {stateLabels[state]}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        {allowedNext.length === 0 && (
          <p className="text-muted-foreground text-sm">
            This season is completed and cannot change status.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSave || updateStateMutation.isPending}
            onClick={() =>
              updateStateMutation.mutate({ id: seasonId, state: selectedState })
            }
          >
            {updateStateMutation.isPending ? "Saving…" : "Update status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
