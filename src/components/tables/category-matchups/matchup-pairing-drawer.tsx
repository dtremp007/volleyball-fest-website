import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Route } from "~/routes/(authenticated)/seasons/$seasonId/configure/$categoryId/matchups";
import { Route as ConfigureLayoutRoute } from "~/routes/(authenticated)/seasons/$seasonId/configure/route";
import { useTRPC } from "~/trpc/react";

export const NEW_MATCHUP_ID = "new";

type MatchupDraft = {
  teamAId: string;
  teamBId: string;
};

function emptyDraft(): MatchupDraft {
  return { teamAId: "", teamBId: "" };
}

export function MatchupPairingDrawer() {
  const { matchupId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { seasonId, categoryId } = Route.useParams();
  const { teams, matchups, groups } = ConfigureLayoutRoute.useLoaderData();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [displayedMatchupId, setDisplayedMatchupId] = useState(matchupId);
  const [draft, setDraft] = useState<MatchupDraft>(() => {
    if (!matchupId || matchupId === NEW_MATCHUP_ID) return emptyDraft();
    const current = matchups.find((item) => item.id === matchupId);
    return current
      ? { teamAId: current.teamA.id, teamBId: current.teamB.id }
      : emptyDraft();
  });
  if (matchupId && matchupId !== displayedMatchupId) {
    const current =
      matchupId === NEW_MATCHUP_ID
        ? null
        : (matchups.find((item) => item.id === matchupId) ?? null);
    setDisplayedMatchupId(matchupId);
    setDraft(
      current ? { teamAId: current.teamA.id, teamBId: current.teamB.id } : emptyDraft(),
    );
  }

  const activeMatchupId = displayedMatchupId;
  const isCreating = activeMatchupId === NEW_MATCHUP_ID;
  const matchup = isCreating
    ? null
    : (matchups.find((item) => item.id === activeMatchupId) ?? null);
  const initialDraft = matchup
    ? { teamAId: matchup.teamA.id, teamBId: matchup.teamB.id }
    : emptyDraft();

  const groupNameById = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name])),
    [groups],
  );
  const categoryTeams = teams.filter((team) => team.category.id === categoryId);
  const teamOptions = [...categoryTeams].sort((a, b) => a.name.localeCompare(b.name));

  const closeDrawer = () => {
    navigate({
      search: (prev) => ({ ...prev, matchupId: undefined }),
      replace: true,
      resetScroll: false,
    });
  };

  const createMutation = useMutation({
    ...trpc.matchup.create.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: trpc.matchup.getBySeasonId.queryKey({ seasonId }),
      });
      await router.invalidate();
      toast.success("Matchup created");
      closeDrawer();
    },
    onError: (error) => toast.error(error.message || "Failed to create matchup"),
  });

  const updateMutation = useMutation({
    ...trpc.matchup.updateTeams.mutationOptions(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: trpc.matchup.getBySeasonId.queryKey({ seasonId }),
      });
      await router.invalidate();
      toast.success("Matchup updated");
      closeDrawer();
    },
    onError: (error) => toast.error(error.message || "Failed to update matchup"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const teamsLocked = Boolean(matchup?.hasScores) && !isCreating;
  const confirmDiscard = () =>
    !isDirty || window.confirm("Discard the unsaved changes to this matchup?");

  const handleOpenChange = (open: boolean) => {
    if (!open && confirmDiscard()) closeDrawer();
  };

  const requestClose = () => {
    if (confirmDiscard()) closeDrawer();
  };

  const save = () => {
    if (!activeMatchupId) return;
    if (!draft.teamAId || !draft.teamBId) {
      toast.error("Select both teams.");
      return;
    }
    if (draft.teamAId === draft.teamBId) {
      toast.error("A matchup needs two different teams.");
      return;
    }

    if (isCreating) {
      createMutation.mutate({
        seasonId,
        categoryId,
        teamAId: draft.teamAId,
        teamBId: draft.teamBId,
      });
      return;
    }

    updateMutation.mutate({
      seasonId,
      categoryId,
      matchupId: activeMatchupId,
      teamAId: draft.teamAId,
      teamBId: draft.teamBId,
    });
  };

  const notFound = Boolean(activeMatchupId) && !isCreating && !matchup;

  return (
    <Drawer open={Boolean(matchupId)} onOpenChange={handleOpenChange} direction="right">
      <DrawerContent className="h-full w-full overflow-hidden data-[vaul-drawer-direction=right]:sm:max-w-xl">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DrawerTitle>{isCreating ? "Add matchup" : "Edit matchup"}</DrawerTitle>
              <DrawerDescription>
                {isCreating
                  ? "Create a pairing between two teams in this category."
                  : "Change the two teams in this pairing."}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close matchup details">
                <X className="size-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        <ScrollArea className="h-0 flex-1">
          {notFound ? (
            <p className="text-muted-foreground p-4 text-sm sm:p-6">Matchup not found.</p>
          ) : (
            <div className="space-y-6 p-4 sm:p-6">
              <Field>
                <FieldLabel htmlFor="matchup-team-a">Team A</FieldLabel>
                <NativeSelect
                  id="matchup-team-a"
                  value={draft.teamAId}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, teamAId: event.target.value }))
                  }
                  disabled={isPending || teamsLocked}
                >
                  <NativeSelectOption value="">Select a team…</NativeSelectOption>
                  {teamOptions.map((team) => {
                    const groupName = team.groupId
                      ? groupNameById.get(team.groupId)
                      : null;
                    return (
                      <NativeSelectOption key={team.id} value={team.id}>
                        {groupName ? `${team.name} (Group ${groupName})` : team.name}
                      </NativeSelectOption>
                    );
                  })}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="matchup-team-b">Team B</FieldLabel>
                <NativeSelect
                  id="matchup-team-b"
                  value={draft.teamBId}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, teamBId: event.target.value }))
                  }
                  disabled={isPending || teamsLocked}
                >
                  <NativeSelectOption value="">Select a team…</NativeSelectOption>
                  {teamOptions.map((team) => {
                    const groupName = team.groupId
                      ? groupNameById.get(team.groupId)
                      : null;
                    return (
                      <NativeSelectOption key={team.id} value={team.id}>
                        {groupName ? `${team.name} (Group ${groupName})` : team.name}
                      </NativeSelectOption>
                    );
                  })}
                </NativeSelect>
              </Field>
              {teamsLocked && (
                <FieldDescription>
                  Teams cannot be changed because this matchup already has scores.
                </FieldDescription>
              )}
            </div>
          )}
        </ScrollArea>
        {!notFound && (
          <DrawerFooter className="border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex w-full justify-end gap-3">
              <Button variant="outline" onClick={requestClose} disabled={isPending}>
                Cancel
              </Button>
              <Button
                onClick={save}
                disabled={isPending || teamsLocked || (!isCreating && !isDirty)}
              >
                {isPending ? "Saving…" : isCreating ? "Create matchup" : "Save changes"}
              </Button>
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
