import { z } from "zod";

export const signupPositionEnum = z.enum([
  "setter",
  "opposite",
  "outside",
  "middle",
  "libero",
  "defensive-specialist",
]);

export const signupFormSchema = z.object({
  seasonId: z.string(),
  name: z.string().min(2, "Team name is required"),
  logoUrl: z.string(),
  categoryId: z.string(),
  captainName: z.string().min(2, "Captain name is required"),
  captainPhone: z.string().min(7, "Captain phone is required"),
  coCaptainName: z.string().min(2, "Co-captain name is required"),
  coCaptainPhone: z.string().min(7, "Co-captain phone is required"),
  players: z
    .array(
      z.object({
        fullName: z.string().min(2, "Full name is required"),
        jerseyNumber: z.string().min(1, "Jersey number is required"),
        positionId: z.string(),
      }),
    )
    .min(1, "Add at least 1 player"),
  unavailableDates: z
    .array(z.string())
    .length(2, "Select exactly two dates")
    .refine((dates) => dates.every((date) => Boolean(date)), {
      message: "Both dates are required",
    }),
  comingFrom: z.string().min(2, "Tell us where the team is coming from"),
});

export type SignupFormValues = z.infer<typeof signupFormSchema>;
