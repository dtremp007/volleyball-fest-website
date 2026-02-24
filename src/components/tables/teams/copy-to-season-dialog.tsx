import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { useTRPC } from "~/trpc/react";

type Props = {
  selectedTeamIds: string[];
  onSuccess?: () => void;
};

export function CopyToSeasonDialog({ selectedTeamIds, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: seasons } = useQuery(trpc.season.getAll.queryOptions());

  const copyMutation = useMutation(
    trpc.team.copyToSeason.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.team.list.queryKey() });
        toast.success(
          `Copied ${selectedTeamIds.length} team${selectedTeamIds.length !== 1 ? "s" : ""} to season`,
        );
        setOpen(false);
        setSelectedSeasonId("");
        onSuccess?.();
      },
      onError: () => {
        toast.error("Failed to copy teams to season");
      },
    }),
  );

  const handleCopy = () => {
    if (!selectedSeasonId) {
      toast.error("Please select a season");
      return;
    }

    copyMutation.mutate({
      teamIds: selectedTeamIds,
      seasonId: selectedSeasonId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Copy className="size-4" />
          Copy to Season
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Teams to Season</DialogTitle>
          <DialogDescription>
            Copy {selectedTeamIds.length} selected team
            {selectedTeamIds.length !== 1 ? "s" : ""} to another season. Teams that
            already exist in the target season will be skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="season">Target Season</Label>
            <NativeSelect
              id="season"
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
            >
              <NativeSelectOption value="">Select a season...</NativeSelectOption>
              {seasons?.map((season) => (
                <NativeSelectOption key={season.id} value={season.id}>
                  {season.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCopy}
            disabled={copyMutation.isPending || !selectedSeasonId}
          >
            {copyMutation.isPending ? "Copying..." : "Copy Teams"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
