import { z } from "zod";

const matchupPairingFields = z.object({
  seasonId: z.string().min(1),
  categoryId: z.string().min(1),
  teamAId: z.string().min(1),
  teamBId: z.string().min(1),
});

function refineDistinctTeams<T extends { teamAId: string; teamBId: string }>(
  schema: z.ZodType<T>,
) {
  return schema.refine((value) => value.teamAId !== value.teamBId, {
    message: "A matchup needs two different teams.",
    path: ["teamBId"],
  });
}

export const createMatchupSchema = refineDistinctTeams(matchupPairingFields);

export const updateMatchupTeamsSchema = refineDistinctTeams(
  matchupPairingFields.extend({
    matchupId: z.string().min(1),
  }),
);

export const deleteMatchupSchema = z.object({
  seasonId: z.string().min(1),
  categoryId: z.string().min(1),
  matchupId: z.string().min(1),
});

export type CreateMatchupValues = z.infer<typeof createMatchupSchema>;
export type UpdateMatchupTeamsValues = z.infer<typeof updateMatchupTeamsSchema>;
export type DeleteMatchupValues = z.infer<typeof deleteMatchupSchema>;
