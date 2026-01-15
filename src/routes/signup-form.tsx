import { useForm, useStore } from "@tanstack/react-form";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import { useMutation } from "@tanstack/react-query";
import { Plus, Trash } from "lucide-react";
import z from "zod";
import AvatarUpload from "~/components/avatar-upload";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { NativeSelect } from "~/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";
import type { SeasonState } from "~/lib/db/schema/team.schema";
import { useTRPC } from "~/trpc/react";
import { signupFormSchema } from "~/validators/signup-form.validators";

export const Route = createFileRoute("/signup-form")({
  component: SignupFormPage,
  errorComponent: SignupFormError,
  validateSearch: z.object({
    teamId: z.string().optional(),
    returnTo: z.string().optional(),
  }),
  pendingComponent: SignupFormPending,
  loaderDeps: ({ search }) => ({ teamId: search.teamId }),
  beforeLoad: async ({ context }) => {
    if (context.session) {
      return { canEdit: true };
    }

    return { canEdit: false };
  },
  loader: async ({ context, deps }) => {
    // wait 2 seconds
    const [categories, positions, season] = await Promise.all([
      context.queryClient.fetchQuery(context.trpc.category.getAll.queryOptions()),
      context.queryClient.fetchQuery(context.trpc.position.getAll.queryOptions()),
      context.queryClient.fetchQuery(
        context.trpc.season.getByState.queryOptions({ state: "signup_open" }),
      ),
    ]);

    if (context.canEdit && deps.teamId) {
      const team = await context.queryClient.fetchQuery(
        context.trpc.team.getById.queryOptions({ id: deps.teamId }),
      );
      return {
        team,
        categories,
        positions,
      };
    }

    return { team: null, season, categories, positions };
  },
});

function SignupFormPage() {
  const trpc = useTRPC();
  const { season: currentSeason, categories, positions, team } = Route.useLoaderData();
  const upsertMutation = useMutation(trpc.team.upsert.mutationOptions());
  const navigate = useNavigate();
  const router = useRouter();
  const { returnTo } = Route.useSearch();

  const form = useForm({
    defaultValues: {
      id: team?.id,
      seasonId: currentSeason?.id ?? team?.season.id ?? "",
      name: team?.name ?? "",
      categoryId: team?.category.id ?? categories?.[0]?.id ?? "",
      logoUrl: team?.logoUrl ?? "",
      captainName: team?.captainName ?? "",
      captainPhone: team?.captainPhone ?? "",
      coCaptainName: team?.coCaptainName ?? "",
      coCaptainPhone: team?.coCaptainPhone ?? "",
      players: team?.players.map((player) => ({
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        positionId: player.position?.id ?? positions?.[0]?.id ?? "",
      })) ?? [{ name: "", jerseyNumber: "", positionId: positions?.[0]?.id ?? "" }],
      unavailableDates: team?.unavailableDates.split(",") ?? ["", ""],
      comingFrom: team?.comingFrom,
      notes: team?.notes || undefined,
      acceptTerms: false,
      acceptCost: false,
    },
    validators: {
      onSubmit: signupFormSchema,
    },
    onSubmitInvalid() {
      // print errors
      console.log(form.state.errors);
      return;
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        await upsertMutation.mutateAsync({
          ...value,
          notes: value.notes ?? undefined,
        });

        router.invalidate();

        if (returnTo) {
          navigate({ to: returnTo });
        }

        toast.success("¡Inscripción enviada!", {
          description: "Hemos recibido los detalles de tu equipo.",
        });
        formApi.reset();
      } catch (error) {
        console.error(error);
        toast.error("No se pudo enviar la inscripción. Por favor, inténtalo de nuevo.");
      }
    },
  });

  const logoValue = useStore(form.store, (state) => state.values.logoUrl);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-2 py-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Inscripción de Equipos</h1>
        </div>
        <p className="sr-only">
          Proporciona los detalles de tu equipo, plantilla y disponibilidad.
        </p>
      </div>

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-6">
              <div className="flex flex-col items-start gap-3">
                <Label htmlFor="logoUrl">Logo</Label>
                <AvatarUpload
                  initialUrl={logoValue || undefined}
                  onUploadSuccess={(url) => form.setFieldValue("logoUrl", url)}
                  onUploadError={(message) => toast.error(message)}
                  disabled={upsertMutation.isPending}
                />
              </div>
              <form.Field
                name="name"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid} className="w-full">
                      <FieldLabel htmlFor={field.name}>Nombre del equipo</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Los Clavados"
                        autoComplete="organization"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              />

              <form.Field
                name="categoryId"
                children={(field) => {
                  return (
                    <RadioGroup
                      className="gap-2"
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      {categories?.map((category) => {
                        return (
                          <FieldLabel
                            key={`category-${category.id}`}
                            htmlFor={`category-${category.id}`}
                          >
                            <Field orientation="horizontal">
                              <FieldContent>
                                <FieldTitle>{category.name}</FieldTitle>
                                <FieldDescription>
                                  {category.description}
                                </FieldDescription>
                              </FieldContent>
                              <RadioGroupItem
                                value={category.id}
                                id={`category-${category.id}`}
                              />
                            </Field>
                          </FieldLabel>
                        );
                      })}
                    </RadioGroup>
                  );
                }}
              />

              <form.Field
                name="captainName"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Capitán</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Juan Pérez"
                        autoComplete="name"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              />
              <form.Field
                name="captainPhone"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Teléfono del capitán</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="625-123-4567"
                        autoComplete="tel"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              />
              <form.Field
                name="coCaptainName"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Co-capitán</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="María González"
                        autoComplete="name"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              />
              <form.Field
                name="coCaptainPhone"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Teléfono del co-capitán
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="625-987-6543"
                        autoComplete="tel"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jugadores</CardTitle>
            <CardDescription>
              Agrega tu plantilla. Usa el menú desplegable para seleccionar la posición de
              cada jugador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form.Field
              name="players"
              mode="array"
              children={(field) => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <FieldGroup className="gap-5">
                    <div className="flex flex-col gap-4">
                      {field.state.value.map((player, index) => (
                        <form.Field
                          key={index}
                          name={`players[${index}]`}
                          children={(playerField) => {
                            const invalid =
                              playerField.state.meta.isTouched &&
                              !playerField.state.meta.isValid;
                            return (
                              <Field
                                orientation="horizontal"
                                data-invalid={invalid}
                                className="flex-col gap-3 rounded-lg pb-4 md:flex-row md:items-center md:gap-4"
                              >
                                <div className="flex w-full items-start gap-3">
                                  <FieldContent className="grid grid-cols-3 gap-3">
                                    <Input
                                      name={`${playerField.name}.name`}
                                      value={playerField.state.value.name}
                                      onBlur={() => playerField.handleBlur()}
                                      className="col-span-3"
                                      onChange={(e) =>
                                        playerField.handleChange({
                                          ...playerField.state.value,
                                          name: e.target.value,
                                        })
                                      }
                                      aria-invalid={invalid}
                                      placeholder="Nombre completo"
                                      autoComplete="name"
                                    />
                                    <div className="col-span-3 md:col-span-2">
                                      <NativeSelect
                                        name={`${playerField.name}.position`}
                                        value={playerField.state.value.positionId}
                                        onBlur={() => playerField.handleBlur()}
                                        onChange={(e) =>
                                          playerField.handleChange({
                                            ...playerField.state.value,
                                            positionId: e.target.value,
                                          })
                                        }
                                        aria-invalid={invalid}
                                      >
                                        {positions?.map((option) => (
                                          <option key={option.id} value={option.id}>
                                            {option.name}
                                          </option>
                                        ))}
                                      </NativeSelect>
                                    </div>
                                    <Input
                                      name={`${playerField.name}.jerseyNumber`}
                                      value={playerField.state.value.jerseyNumber}
                                      type="number"
                                      className="col-span-3 md:col-span-1"
                                      min={0}
                                      onBlur={() => playerField.handleBlur()}
                                      onChange={(e) =>
                                        playerField.handleChange({
                                          ...playerField.state.value,
                                          jerseyNumber: e.target.value,
                                        })
                                      }
                                      aria-invalid={invalid}
                                      placeholder="Número de camiseta"
                                    />
                                  </FieldContent>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => field.removeValue(index)}
                                    disabled={field.state.value.length === 1}
                                  >
                                    <Trash className="size-4" />
                                  </Button>
                                </div>
                                {invalid && (
                                  <FieldError errors={playerField.state.meta.errors} />
                                )}
                              </Field>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          field.pushValue({
                            name: "",
                            jerseyNumber: "",
                            positionId: positions?.[0]?.id ?? "",
                          })
                        }
                      >
                        <Plus className="size-4" />
                        Agregar jugador
                      </Button>
                    </div>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </FieldGroup>
                );
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Disponibilidad y Ubicación</CardTitle>
            <CardDescription>
              Dinos cuándo no puedes jugar y dónde se encuentra el equipo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field
                  name="unavailableDates[0]"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Fecha no disponible 1
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="date"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                />
                <form.Field
                  name="unavailableDates[1]"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Fecha no disponible 2
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="date"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                />
              </div>

              <form.Field
                name="comingFrom"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        ¿De dónde viene la mayoría del equipo? Tomaremos esto en cuenta al
                        programar los juegos.
                      </FieldLabel>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Cuauhtémoc, Corredor, Jagüeyes, etc."
                        rows={3}
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              />
              <form.Field
                name="notes"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Notas</FieldLabel>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Notas adicionales"
                        rows={3}
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              />

              <form.Field
                name="acceptTerms"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={field.name}
                          checked={field.state.value}
                          onCheckedChange={(checked) =>
                            field.handleChange(checked as boolean)
                          }
                          onBlur={field.handleBlur}
                          aria-invalid={isInvalid}
                        />
                        <div className="flex flex-col gap-1">
                          <Label
                            htmlFor={field.name}
                            className="cursor-pointer text-sm font-normal"
                          >
                            Acepto que la información proporcionada es correcta y será
                            utilizada únicamente para la administración del torneo de
                            voleibol. También acepto aparecer en cualquier medio de
                            comunicación que se capture durante el evento.
                          </Label>
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </div>
                      </div>
                    </Field>
                  );
                }}
              />

              <form.Field
                name="acceptCost"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={field.name}
                          checked={field.state.value}
                          onCheckedChange={(checked) =>
                            field.handleChange(checked as boolean)
                          }
                          onBlur={field.handleBlur}
                          aria-invalid={isInvalid}
                        />
                        <div className="flex flex-col gap-1">
                          <Label
                            htmlFor={field.name}
                            className="cursor-pointer text-sm font-normal"
                          >
                            <span>
                              Entiendo que al inscribirme, el costo es de{" "}
                              <strong>$3,500 MXN</strong> por equipo.
                            </span>
                          </Label>
                          {isInvalid && <FieldError errors={field.state.meta.errors} />}
                        </div>
                      </div>
                    </Field>
                  );
                }}
              />
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={upsertMutation.isPending}
            >
              Limpiar
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting ? "Enviando..." : "Enviar inscripción"}
                </Button>
              )}
            />
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

function SignupFormPending() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Inscripción de Equipos</h1>
      </div>
    </div>
  );
}

// let user know there is currently no signup form
function SignupFormError() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Inscripción de Equipos</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Inscripciones Cerradas</CardTitle>
          <CardDescription>
            No hay inscripciones abiertas en este momento.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
