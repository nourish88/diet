import { z } from "zod";
import { dateIso, nonEmpty, phoneTr } from "../shared/primitives";

export const CreateClientInput = z.object({
  name: nonEmpty,
  surname: nonEmpty,
  phone: phoneTr,
  email: z.string().email().optional().nullable(),
  birthDate: dateIso.optional().nullable(),
  notes: z.string().optional().nullable(),
  tanitaMemberId: z.coerce.number().int().positive().optional().nullable(),
});

export type CreateClientInput = z.infer<typeof CreateClientInput>;

export const UpdateClientInput = CreateClientInput.partial();
export type UpdateClientInput = z.infer<typeof UpdateClientInput>;
