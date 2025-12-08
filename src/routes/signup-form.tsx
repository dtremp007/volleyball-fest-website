import { useForm, useStore } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { useMutation } from "@tanstack/react-query";
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupText } from "~/components/ui/input-group";
import { Textarea } from "~/components/ui/textarea";
import { useTRPC } from "~/trpc/react";

const positions = [
  { value: "setter", label: "Setter" },
  { value: "opposite", label: "Opposite" },
  { value: "outside", label: "Outside" },
  { value: "middle", label: "Middle" },
  { value: "libero", label: "Libero" },
  { value: "defensive-specialist", label: "Defensive Specialist" },
];

const formSchema = z.object({
  teamName: z.string().min(2, "Team name is required"),
  logoUrl: z
    .union([z.url({ message: "Logo must be a valid URL" }), z.literal("")])
    .optional(),
  category: z.enum(["men", "women"]),
  captainName: z.string().min(2, "Captain name is required"),
  captainPhone: z.string().min(7, "Captain phone is required"),
  coCaptainName: z.string().min(2, "Co-captain name is required"),
  coCaptainPhone: z.string().min(7, "Co-captain phone is required"),
  players: z
    .array(
      z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        jerseyNumber: z.string().min(1, "Jersey number is required"),
        position: z.enum([
          "setter",
          "opposite",
          "outside",
          "middle",
          "libero",
          "defensive-specialist",
        ]),
      }),
    )
    .min(6, "Add at least 6 players"),
  unavailableDates: z
    .array(z.string())
    .length(2, "Select exactly two dates")
    .refine((dates) => dates.every((date) => Boolean(date)), {
      message: "Both dates are required",
    }),
  origin: z.string().min(2, "Tell us where the team is coming from"),
});

type FormValues = z.infer<typeof formSchema>;

const defaultPlayers = Array.from({ length: 6 }).map(() => ({
  firstName: "",
  lastName: "",
  jerseyNumber: "",
  position: positions[0].value,
}));

export const Route = createFileRoute("/signup-form")({
  component: SignupFormPage,
});

function SignupFormPage() {
  const trpc = useTRPC();
  const signupMutation = useMutation(trpc.signup.submit.mutationOptions());

  const form = useForm({
    defaultValues: {
      teamName: "",
      logoUrl: "",
      category: "men",
      captainName: "",
      captainPhone: "",
      coCaptainName: "",
      coCaptainPhone: "",
      players: defaultPlayers,
      unavailableDates: ["", ""],
      origin: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        await signupMutation.mutateAsync(value);
        toast.success("Signup submitted!", {
          description: "We received your team signup details.",
        });
        formApi.reset();
      } catch (error) {
        console.error(error);
        toast.error("Could not submit signup. Please try again.");
      }
    },
  });

  const logoValue = useStore(form.store, (state) => state.values.logoUrl);

  const canAddPlayers = useStore(form.store, (state) => state.values.players.length < 20);

  return (
    <div className="mx-auto w-full flex max-w-5xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Volleyball Team Signup</h1>
        <p className="text-muted-foreground">
          Provide your team details, roster, and availability.
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
            <CardTitle>Team Details</CardTitle>
            <CardDescription>Basic info and contacts for your team.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-6">
              <form.Field
                name="teamName"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Team name</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Blue Spikers"
                        autoComplete="organization"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <form.Field
                  name="category"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Category</FieldLabel>
                        <select
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) =>
                            field.handleChange(e.target.value as FormValues["category"])
                          }
                          aria-invalid={isInvalid}
                          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none"
                        >
                          <option value="men">Men&apos;s</option>
                          <option value="women">Women&apos;s</option>
                        </select>
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                />

                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldLabel>Team logo</FieldLabel>
                    <FieldDescription>Upload your team logo (optional).</FieldDescription>
                    <AvatarUpload
                      initialUrl={logoValue || undefined}
                      onUploadSuccess={(url) => form.setFieldValue("logoUrl", url)}
                      onUploadError={(message) => toast.error(message)}
                      disabled={signupMutation.isPending}
                    />
                  </FieldContent>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <form.Field
                  name="captainName"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Captain</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="Alex Johnson"
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
                        <FieldLabel htmlFor={field.name}>Captain phone</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="(555) 123-4567"
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
                        <FieldLabel htmlFor={field.name}>Co-captain</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="Sam Doe"
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
                        <FieldLabel htmlFor={field.name}>Co-captain phone</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="(555) 987-6543"
                          autoComplete="tel"
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Players</CardTitle>
            <CardDescription>
              Add your roster. Use the dropdown to set each player&apos;s position.
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
                    <FieldLegend variant="label">Roster</FieldLegend>
                    <div className="flex flex-col gap-4">
                      {field.state.value.map((_, index) => (
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
                                className="flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:gap-4"
                              >
                                <FieldContent className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-4">
                                  <Input
                                    name={`${playerField.name}.firstName`}
                                    value={playerField.state.value.firstName}
                                    onBlur={() => playerField.handleBlur()}
                                    onChange={(e) =>
                                      playerField.handleChange({
                                        ...playerField.state.value,
                                        firstName: e.target.value,
                                      })
                                    }
                                    aria-invalid={invalid}
                                    placeholder="First name"
                                    autoComplete="given-name"
                                  />
                                  <Input
                                    name={`${playerField.name}.lastName`}
                                    value={playerField.state.value.lastName}
                                    onBlur={() => playerField.handleBlur()}
                                    onChange={(e) =>
                                      playerField.handleChange({
                                        ...playerField.state.value,
                                        lastName: e.target.value,
                                      })
                                    }
                                    aria-invalid={invalid}
                                    placeholder="Last name"
                                    autoComplete="family-name"
                                  />
                                  <Input
                                    name={`${playerField.name}.jerseyNumber`}
                                    value={playerField.state.value.jerseyNumber}
                                    onBlur={() => playerField.handleBlur()}
                                    onChange={(e) =>
                                      playerField.handleChange({
                                        ...playerField.state.value,
                                        jerseyNumber: e.target.value,
                                      })
                                    }
                                    aria-invalid={invalid}
                                    placeholder="Jersey #"
                                  />
                                  <select
                                    name={`${playerField.name}.position`}
                                    value={playerField.state.value.position}
                                    onBlur={() => playerField.handleBlur()}
                                    onChange={(e) =>
                                      playerField.handleChange({
                                        ...playerField.state.value,
                                        position: e.target.value,
                                      })
                                    }
                                    aria-invalid={invalid}
                                    className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none"
                                  >
                                    {positions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </FieldContent>
                                <div className="flex items-center gap-2">
                                  <InputGroup>
                                    <InputGroupAddon align="inline-end">
                                      <InputGroupText>#{index + 1}</InputGroupText>
                                    </InputGroupAddon>
                                  </InputGroup>
                                  {field.state.value.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => field.removeValue(index)}
                                      disabled={field.state.value.length <= 6}
                                    >
                                      Remove
                                    </Button>
                                  )}
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
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          field.pushValue({
                            firstName: "",
                            lastName: "",
                            jerseyNumber: "",
                            position: positions[0].value,
                          })
                        }
                        disabled={!canAddPlayers}
                      >
                        Add player
                      </Button>
                      <FieldDescription>
                        Minimum 6 players. Maximum 20 players.
                      </FieldDescription>
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
            <CardTitle>Availability & Location</CardTitle>
            <CardDescription>
              Tell us when you cannot play and where the team is based.
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
                        <FieldLabel htmlFor={field.name}>Unavailable date 1</FieldLabel>
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
                        <FieldLabel htmlFor={field.name}>Unavailable date 2</FieldLabel>
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
                name="origin"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Where is most of the team coming from?
                      </FieldLabel>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="City, gym, or club name"
                        rows={3}
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
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
              disabled={signupMutation.isPending}
            >
              Reset
            </Button>
            <Button type="submit" disabled={signupMutation.isPending}>
              {signupMutation.isPending ? "Submitting..." : "Submit signup"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
