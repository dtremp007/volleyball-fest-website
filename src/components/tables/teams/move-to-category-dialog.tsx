import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderInput } from "lucide-react";
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
import { Route } from "~/routes/(authenticated)/seasons/$seasonId/teams";
import { useTRPC } from "~/trpc/react";

type Props = {
  selectedTeamIds: string[];
  onSuccess?: () => void;
};

export function MoveToCategoryDialog({ selectedTeamIds, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { seasonId } = Route.useParams();

  const { data: categories } = useQuery(trpc.category.getAll.queryOptions());

  const moveMutation = useMutation(
    trpc.team.moveToCategory.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries({ queryKey: trpc.team.list.queryKey() });
        toast.success(
          `Moved ${result.count} team${result.count !== 1 ? "s" : ""} to category`,
        );
        setOpen(false);
        setSelectedCategoryId("");
        onSuccess?.();
      },
      onError: () => {
        toast.error("Failed to move teams to category");
      },
    }),
  );

  const handleMove = () => {
    if (!selectedCategoryId) {
      toast.error("Please select a category");
      return;
    }

    moveMutation.mutate({
      seasonId,
      teamIds: selectedTeamIds,
      categoryId: selectedCategoryId,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSelectedCategoryId("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FolderInput className="size-4 shrink-0" />
          <span className="whitespace-nowrap">Move Category</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Teams to Category</DialogTitle>
          <DialogDescription>
            Move {selectedTeamIds.length} selected team
            {selectedTeamIds.length !== 1 ? "s" : ""} to another category. Group
            assignments will be cleared.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="category">Target Category</Label>
            <NativeSelect
              id="category"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              <NativeSelectOption value="">Select a category...</NativeSelectOption>
              {categories?.map((category) => (
                <NativeSelectOption key={category.id} value={category.id}>
                  {category.name}
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
            onClick={handleMove}
            disabled={moveMutation.isPending || !selectedCategoryId}
          >
            {moveMutation.isPending ? "Moving..." : "Move Teams"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
