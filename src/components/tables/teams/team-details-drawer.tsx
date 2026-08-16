import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { format } from "date-fns";
import { Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import AvatarUpload from "~/components/avatar-upload";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { NativeSelect } from "~/components/ui/native-select";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import {
  fromCalendarDates,
  parseUnavailableDates,
  toCalendarDates,
} from "~/lib/unavailable-dates";
import { cn } from "~/lib/utils";
import { Route } from "~/routes/(authenticated)/seasons/$seasonId/teams";
import { useTRPC } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/router";

const routeApi = getRouteApi("/(authenticated)/seasons/$seasonId/teams");

type DraftPlayer = {
  id?: string;
  name: string;
  jerseyNumber: string;
  positionId: string;
};

type TeamDraft = {
  name: string;
  logoUrl: string;
  categoryId: string;
  captainName: string;
  captainPhone: string;
  coCaptainName: string;
  coCaptainPhone: string;
  players: DraftPlayer[];
  unavailableDates: string[];
  comingFrom: string;
  isFarAway: boolean;
  notes: string;
};

export function TeamDetailsDrawer() {
  const { teamId } = routeApi.useSearch();
  const { seasonId } = Route.useParams();
  const navigate = Route.useNavigate();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<TeamDraft | null>(null);
  const [initialDraft, setInitialDraft] = useState<TeamDraft | null>(null);

  const { data: team, isLoading } = useQuery({
    ...trpc.team.getForSeason.queryOptions({ seasonId, teamId: teamId! }),
    enabled: Boolean(teamId),
  });
  const { data: categories = [] } = useQuery(trpc.category.getAll.queryOptions());
  const { data: positions = [] } = useQuery(trpc.position.getAll.queryOptions());

  const updateTeam = useMutation({
    ...trpc.team.updateForSeason.mutationOptions(),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trpc.team.getForSeason.queryKey({ seasonId, teamId: teamId! }),
        }),
        queryClient.invalidateQueries({
          queryKey: trpc.team.list.queryKey({ seasonId }),
        }),
      ]);
      setIsEditing(false);
      toast.success(`${draft?.name ?? "Team"} updated`);
    },
    onError: (error) => toast.error(error.message || "Team could not be updated"),
  });

  const makeDraft = useMemo(() => {
    if (!team) return null;
    const dates = parseUnavailableDates(team.unavailableDates);
    return {
      name: team.name,
      logoUrl: team.logoUrl,
      categoryId: team.category.id,
      captainName: team.captainName,
      captainPhone: team.captainPhone,
      coCaptainName: team.coCaptainName,
      coCaptainPhone: team.coCaptainPhone,
      players: team.players.map((player) => ({
        id: player.id,
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        positionId: player.position?.id ?? positions[0]?.id ?? "",
      })),
      unavailableDates: dates,
      comingFrom: team.comingFrom,
      isFarAway: Boolean(team.isFarAway),
      notes: team.notes ?? "",
    } satisfies TeamDraft;
  }, [positions, team]);

  const isDirty = Boolean(
    isEditing &&
    draft &&
    initialDraft &&
    JSON.stringify(draft) !== JSON.stringify(initialDraft),
  );

  const confirmDiscard = () =>
    !isDirty || window.confirm("Discard the unsaved changes to this team?");

  const handleOpenChange = (open: boolean) => {
    if (!open && confirmDiscard()) {
      setIsEditing(false);
      navigate({ search: (prev) => ({ ...prev, teamId: undefined }) });
    }
  };

  const cancelEditing = () => {
    if (!confirmDiscard()) return;
    setDraft(initialDraft);
    setIsEditing(false);
  };

  const save = () => {
    if (!draft || !teamId) return;
    const required = [
      draft.name,
      draft.categoryId,
      draft.captainName,
      draft.captainPhone,
      draft.coCaptainName,
      draft.coCaptainPhone,
    ];
    if (required.some((value) => !value.trim())) {
      toast.error("Complete the team and captain fields before saving.");
      return;
    }
    if (!draft.players.length || draft.players.some((player) => !player.name.trim())) {
      toast.error("Add at least one player and enter every player name.");
      return;
    }
    updateTeam.mutate({
      seasonId,
      teamId,
      data: {
        ...draft,
        notes: draft.notes || undefined,
        comingFrom: draft.comingFrom || undefined,
      },
    });
  };

  const setField = <K extends keyof TeamDraft>(key: K, value: TeamDraft[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const startEditing = () => {
    if (!makeDraft) return;
    setDraft(makeDraft);
    setInitialDraft(makeDraft);
    setIsEditing(true);
  };

  return (
    <Drawer open={Boolean(teamId)} onOpenChange={handleOpenChange} direction="right">
      <DrawerContent className="h-full w-full overflow-hidden data-[vaul-drawer-direction=right]:sm:max-w-xl">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {isLoading ? (
                <Skeleton className="size-10 rounded-full" />
              ) : team ? (
                <Avatar className="size-10 shrink-0">
                  {team.logoUrl && (
                    <AvatarImage src={team.logoUrl} alt={`${team.name} logo`} />
                  )}
                  <AvatarFallback>{team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              ) : null}
              <div className="min-w-0">
                <DrawerTitle className="truncate">
                  {isEditing ? "Edit team" : (team?.name ?? "Team details")}
                </DrawerTitle>
                <DrawerDescription>
                  {isEditing
                    ? `Update this registration for ${team?.season.name ?? "the season"}.`
                    : (team?.season.name ?? "Loading registration…")}
                </DrawerDescription>
              </div>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close team details">
                <X className="size-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <ScrollArea className="h-0 flex-1">
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <DrawerLoadingSkeleton />
            ) : !team ? (
              <p className="text-muted-foreground text-sm">
                Team not found in this season.
              </p>
            ) : isEditing && draft ? (
              <TeamEditForm
                draft={draft}
                categories={categories}
                positions={positions}
                disabled={updateTeam.isPending}
                setField={setField}
              />
            ) : (
              <TeamReadView team={team} />
            )}
          </div>
        </ScrollArea>

        {team && (
          <DrawerFooter className="border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
            {isEditing ? (
              <div className="flex w-full justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  disabled={updateTeam.isPending}
                >
                  Keep existing details
                </Button>
                <Button onClick={save} disabled={updateTeam.isPending || !isDirty}>
                  {updateTeam.isPending ? "Saving changes…" : "Save changes"}
                </Button>
              </div>
            ) : (
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" asChild>
                  <a
                    href={`/api/team-pdf?seasonId=${encodeURIComponent(seasonId)}&teamId=${encodeURIComponent(team.id)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View roster PDF
                  </a>
                </Button>
                <Button onClick={startEditing}>Edit team</Button>
              </div>
            )}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function TeamReadView({
  team,
}: {
  team: NonNullable<RouterOutputs["team"]["getForSeason"]>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{team.category.name}</Badge>
        {Boolean(team.isFarAway) && <Badge variant="outline">Travelling team</Badge>}
      </div>
      <section className="grid gap-5 sm:grid-cols-2">
        <Detail
          label="Captain"
          value={team.captainName}
          href={`tel:${team.captainPhone}`}
          secondary={team.captainPhone}
        />
        <Detail
          label="Co-captain"
          value={team.coCaptainName}
          href={`tel:${team.coCaptainPhone}`}
          secondary={team.coCaptainPhone}
        />
      </section>
      <Separator />
      <section>
        <h3 className="text-muted-foreground mb-3 text-sm font-medium">
          Roster ({team.players.length})
        </h3>
        <div className="divide-y rounded-lg border">
          {team.players.map((player) => (
            <div key={player.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
                {player.jerseyNumber || "–"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {player.name}
              </span>
              {player.position?.name && (
                <span className="text-muted-foreground text-xs">
                  {player.position.name}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
      <Separator />
      <div className="grid gap-5 sm:grid-cols-2">
        <Detail label="Coming from" value={team.comingFrom || "Not specified"} />
        <UnavailableDatesReadView dates={parseUnavailableDates(team.unavailableDates)} />
      </div>
      {team.notes && <Detail label="Notes" value={team.notes} />}
    </div>
  );
}

function Detail({
  label,
  value,
  secondary,
  href,
}: {
  label: string;
  value: string;
  secondary?: string;
  href?: string;
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-muted-foreground text-sm font-medium">{label}</h3>
      <p className="text-sm font-medium">{value}</p>
      {secondary && href && (
        <a href={href} className="text-primary text-sm hover:underline">
          {secondary}
        </a>
      )}
    </div>
  );
}

function formatUnavailableDateLabel(dateString: string): string {
  const [date] = toCalendarDates([dateString]);
  if (!date) return dateString;
  return format(date, "EEE, MMM d, yyyy");
}

function UnavailableDatesReadView({ dates }: { dates: string[] }) {
  const sortedDates = [...dates].sort();

  return (
    <div className="space-y-1">
      <h3 className="text-muted-foreground text-sm font-medium">Unavailable dates</h3>
      {sortedDates.length === 0 ? (
        <p className="text-sm font-medium">None</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {sortedDates.map((date) => (
            <Badge key={date} variant="secondary">
              {formatUnavailableDateLabel(date)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function UnavailableDatesEditor({
  dates,
  disabled,
  onChange,
}: {
  dates: string[];
  disabled: boolean;
  onChange: (dates: string[]) => void;
}) {
  const selectedDates = toCalendarDates(dates);

  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>Unavailable dates</FieldLabel>
        {dates.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs"
            onClick={() => onChange([])}
            disabled={disabled}
          >
            Clear all
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-sm">
        Click dates to block the team from being scheduled. You can select as many as
        needed.
      </p>
      <Calendar
        mode="multiple"
        showOutsideDays={false}
        numberOfMonths={1}
        defaultMonth={selectedDates[0] ?? new Date()}
        selected={selectedDates}
        onSelect={(nextDates) => {
          onChange(fromCalendarDates(nextDates ?? []));
        }}
        className={cn(
          "rounded-lg border shadow-sm",
          disabled && "pointer-events-none opacity-60",
        )}
      />
      {selectedDates.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {fromCalendarDates(selectedDates).map((date) => (
            <Badge key={date} variant="secondary" className="gap-1 pr-1">
              {formatUnavailableDateLabel(date)}
              <button
                type="button"
                className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                aria-label={`Remove ${formatUnavailableDateLabel(date)}`}
                onClick={() => onChange(dates.filter((value) => value !== date))}
                disabled={disabled}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No dates blocked</p>
      )}
    </Field>
  );
}

function TeamEditForm({
  draft,
  categories,
  positions,
  disabled,
  setField,
}: {
  draft: TeamDraft;
  categories: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string }>;
  disabled: boolean;
  setField: <K extends keyof TeamDraft>(key: K, value: TeamDraft[K]) => void;
}) {
  const updatePlayer = (index: number, patch: Partial<DraftPlayer>) => {
    setField(
      "players",
      draft.players.map((player, playerIndex) =>
        playerIndex === index ? { ...player, ...patch } : player,
      ),
    );
  };
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <Label>Team logo</Label>
          <div className="mt-2">
            <AvatarUpload
              initialUrl={draft.logoUrl || undefined}
              onUploadSuccess={(url) => setField("logoUrl", url)}
              onUploadError={(message) => toast.error(message)}
              disabled={disabled}
            />
          </div>
        </div>
        <Field>
          <FieldLabel htmlFor="admin-team-name">Team name</FieldLabel>
          <Input
            id="admin-team-name"
            value={draft.name}
            onChange={(event) => setField("name", event.target.value)}
            disabled={disabled}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="admin-team-category">Category</FieldLabel>
          <NativeSelect
            id="admin-team-category"
            value={draft.categoryId}
            onChange={(event) => setField("categoryId", event.target.value)}
            disabled={disabled}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </section>
      <Separator />
      <section className="space-y-4">
        <h3 className="font-semibold">Captains</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Captain name"
            value={draft.captainName}
            onChange={(value) => setField("captainName", value)}
            disabled={disabled}
          />
          <TextField
            label="Captain phone"
            value={draft.captainPhone}
            onChange={(value) => setField("captainPhone", value)}
            disabled={disabled}
            type="tel"
          />
          <TextField
            label="Co-captain name"
            value={draft.coCaptainName}
            onChange={(value) => setField("coCaptainName", value)}
            disabled={disabled}
          />
          <TextField
            label="Co-captain phone"
            value={draft.coCaptainPhone}
            onChange={(value) => setField("coCaptainPhone", value)}
            disabled={disabled}
            type="tel"
          />
        </div>
      </section>
      <Separator />
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Roster ({draft.players.length})</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setField("players", [
                ...draft.players,
                { name: "", jerseyNumber: "", positionId: positions[0]?.id ?? "" },
              ])
            }
            disabled={disabled}
          >
            <Plus className="size-4" /> Add player
          </Button>
        </div>
        <div className="space-y-3">
          {draft.players.map((player, index) => (
            <div
              key={player.id ?? `new-${index}`}
              className="grid grid-cols-[5rem_1fr_auto] gap-2 rounded-lg border p-3"
            >
              <Input
                aria-label={`Player ${index + 1} jersey number`}
                placeholder="#"
                value={player.jerseyNumber}
                onChange={(event) =>
                  updatePlayer(index, { jerseyNumber: event.target.value })
                }
                disabled={disabled}
              />
              <Input
                aria-label={`Player ${index + 1} name`}
                placeholder="Player name"
                value={player.name}
                onChange={(event) => updatePlayer(index, { name: event.target.value })}
                disabled={disabled}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${player.name || `player ${index + 1}`}`}
                onClick={() =>
                  setField(
                    "players",
                    draft.players.filter((_, playerIndex) => playerIndex !== index),
                  )
                }
                disabled={disabled || draft.players.length === 1}
              >
                <Trash2 className="size-4" />
              </Button>
              <NativeSelect
                className="col-span-3"
                aria-label={`Player ${index + 1} position`}
                value={player.positionId}
                onChange={(event) =>
                  updatePlayer(index, { positionId: event.target.value })
                }
                disabled={disabled}
              >
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ))}
        </div>
      </section>
      <Separator />
      <section className="space-y-4">
        <h3 className="font-semibold">Availability and notes</h3>
        <UnavailableDatesEditor
          dates={draft.unavailableDates}
          disabled={disabled}
          onChange={(dates) => setField("unavailableDates", dates)}
        />
        <Field>
          <FieldLabel htmlFor="coming-from">Coming from</FieldLabel>
          <Input
            id="coming-from"
            value={draft.comingFrom}
            onChange={(event) => setField("comingFrom", event.target.value)}
            disabled={disabled}
          />
        </Field>
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <Checkbox
            id="far-away"
            checked={draft.isFarAway}
            onCheckedChange={(checked) => setField("isFarAway", checked === true)}
            disabled={disabled}
          />
          <Label htmlFor="far-away">
            Travelling team with limited scheduling availability
          </Label>
        </div>
        <Field>
          <FieldLabel htmlFor="team-notes">Notes</FieldLabel>
          <Textarea
            id="team-notes"
            value={draft.notes}
            onChange={(event) => setField("notes", event.target.value)}
            rows={4}
            disabled={disabled}
          />
        </Field>
      </section>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: string;
}) {
  const id = `field-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </Field>
  );
}

function DrawerLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-36" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
