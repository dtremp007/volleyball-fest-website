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
  id: z.string().or(z.undefined()),
  seasonId: z.string(),
  name: z.string().min(2, "El nombre del equipo es requerido"),
  logoUrl: z.string(),
  categoryId: z.string(),
  captainName: z.string().min(2, "El nombre del capitán es requerido"),
  captainPhone: z.string().min(7, "El teléfono del capitán es requerido"),
  coCaptainName: z.string().min(2, "El nombre del co-capitán es requerido"),
  coCaptainPhone: z.string().min(7, "El teléfono del co-capitán es requerido"),
  players: z
    .array(
      z.object({
        name: z.string().min(2, "El nombre completo es requerido"),
        jerseyNumber: z.string().min(1, "El número de camiseta es requerido"),
        positionId: z.string(),
      }),
    )
    .min(1, "Agrega al menos 1 jugador"),
  unavailableDates: z.array(z.string()),
  comingFrom: z.string().or(z.undefined()),
  notes: z.string().or(z.undefined()),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "Debes aceptar los términos y condiciones",
  }),
  acceptCost: z.boolean().refine((val) => val === true, {
    message: "Debes aceptar el costo de inscripción",
  }),
});

export type SignupFormValues = z.infer<typeof signupFormSchema>;
