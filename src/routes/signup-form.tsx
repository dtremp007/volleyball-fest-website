import { useForm, useStore } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash } from "lucide-react";
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
  FieldTitle,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { NativeSelect } from "~/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";
import { useTRPC } from "~/trpc/react";
import { signupFormSchema } from "~/validators/signup-form.validators";


export const Route = createFileRoute("/signup-form")({
  component: SignupFormPage,
});

function SignupFormPage() {
  const trpc = useTRPC();
  const { data: currentSeason } = useQuery(trpc.season.getCurrent.queryOptions());
  const { data: categories } = useQuery(trpc.category.getAll.queryOptions());
  const { data: positions } = useQuery(trpc.position.getAll.queryOptions());

  const signupMutation = useMutation(trpc.signupForm.submit.mutationOptions());

  const form = useForm({
    defaultValues: {
      seasonId: currentSeason?.id ?? "",
      name: "",
      categoryId: categories?.[0]?.id ?? "",
      logoUrl: "",
      captainName: "",
      captainPhone: "",
      coCaptainName: "",
      coCaptainPhone: "",
      players: [{ fullName: "", jerseyNumber: "", positionId: positions?.[0]?.id ?? "" }],
      unavailableDates: ["", ""],
      comingFrom: "",
    },
    validators: {
      onSubmit: signupFormSchema,
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Volleyball Team Signup</h1>
        <p className="sr-only">Provide your team details, roster, and availability.</p>
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
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-6">
              <div className="flex flex-col items-start gap-3">
                <Label htmlFor="logoUrl">Logo</Label>
                <AvatarUpload
                  initialUrl={logoValue || undefined}
                  onUploadSuccess={(url) => form.setFieldValue("logoUrl", url)}
                  onUploadError={(message) => toast.error(message)}
                  disabled={signupMutation.isPending}
                />
              </div>
              <form.Field
                name="name"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid} className="w-full">
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
                    <div className="flex flex-col gap-4">
                      {field.state.value.map((player, index) => (
                        <form.Field
                          key={`${player.fullName}`}
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
                                <div className="flex w-full items-start gap-3">
                                  <FieldContent className="grid grid-cols-3 gap-3">
                                    <Input
                                      name={`${playerField.name}.fullName`}
                                      value={playerField.state.value.fullName}
                                      onBlur={() => playerField.handleBlur()}
                                      className="col-span-3"
                                      onChange={(e) =>
                                        playerField.handleChange({
                                          ...playerField.state.value,
                                          fullName: e.target.value,
                                        })
                                      }
                                      aria-invalid={invalid}
                                      placeholder="Full name"
                                      autoComplete="name"
                                    />
                                    <div className="col-span-2">
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
                                      min={0}
                                      onBlur={() => playerField.handleBlur()}
                                      onChange={(e) =>
                                        playerField.handleChange({
                                          ...playerField.state.value,
                                          jerseyNumber: e.target.value,
                                        })
                                      }
                                      aria-invalid={invalid}
                                      placeholder="Jersey number"
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
                            fullName: "",
                            jerseyNumber: "",
                            positionId: positions?.[0]?.id ?? "",
                          })
                        }
                      >
                        <Plus className="size-4" />
                        Add player
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
                name="comingFrom"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>
                        Where is most of the team coming from? We will take this into
                        account when scheduling games.
                      </FieldLabel>
                      <Textarea
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="Cuauhtemoc, Corredor, Jagueyes, etc."
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
