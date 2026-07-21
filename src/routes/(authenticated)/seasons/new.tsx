import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type SyntheticEvent } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { LAST_SEASON_STORAGE_KEY } from "~/lib/season-navigation";
import { slugifySeasonId } from "~/lib/season-id";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/(authenticated)/seasons/new")({
  component: NewSeasonPage,
});

function NewSeasonPage() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const seasonIdPreview = slugifySeasonId(name);
  const createSeason = useMutation({
    ...trpc.season.create.mutationOptions(),
    onSuccess: async (season) => {
      localStorage.setItem(LAST_SEASON_STORAGE_KEY, season.id);
      await queryClient.invalidateQueries({ queryKey: trpc.season.getAll.queryKey() });
      toast.success(`${season.name} created`);
      navigate({
        to: "/seasons/$seasonId",
        params: { seasonId: season.id },
        replace: true,
      });
    },
    onError: (error) => toast.error(error.message || "Season could not be created"),
  });

  const submit = (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    event.preventDefault();
    if (!name.trim() || !startDate || !endDate) {
      toast.error("Enter a name, start date, and end date.");
      return;
    }
    if (!slugifySeasonId(name)) {
      toast.error("Season name must include letters or numbers.");
      return;
    }
    if (endDate < startDate) {
      toast.error("End date must be on or after the start date.");
      return;
    }
    createSeason.mutate({ name: name.trim(), startDate, endDate });
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create season</h1>
        <p className="text-muted-foreground">
          New seasons begin as drafts. Open sign-up when the registration form is ready.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-8 rounded-xl border p-6 shadow-sm">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="season-name">Season name</FieldLabel>
            <Input
              id="season-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Spring 2027"
              autoFocus
            />
            <FieldDescription>
              {seasonIdPreview
                ? `URL id: ${seasonIdPreview}`
                : "The season URL id is generated from this name."}
            </FieldDescription>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="season-start">Start date</FieldLabel>
              <Input
                id="season-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="season-end">End date</FieldLabel>
              <Input
                id="season-end"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </Field>
          </div>
        </FieldGroup>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => history.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={createSeason.isPending}>
            {createSeason.isPending ? "Creating season…" : "Create season"}
          </Button>
        </div>
      </form>
    </div>
  );
}
