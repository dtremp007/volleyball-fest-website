import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";

import { publicProcedure } from "~/trpc/init";

const positionEnum = z.enum([
  "setter",
  "opposite",
  "outside",
  "middle",
  "libero",
  "defensive-specialist",
]);

export const signupRouter = {
  submit: publicProcedure
    .input(
      z.object({
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
              position: positionEnum,
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
      }),
    )
    .mutation(async ({ input }) => {
      // For now we simply log the payload. Replace with persistence later.
      console.log("[team-signup] submission received", input);
      return { success: true };
    }),
} satisfies TRPCRouterRecord;
