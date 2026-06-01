import { z } from "zod";
import { dateIso, idParam, nonEmpty } from "../shared/primitives";

export const DietItemInput = z.object({
  besinAdi: nonEmpty,
  birimAdi: nonEmpty,
  miktar: z.coerce.number().positive(),
  notlar: z.string().optional().nullable(),
});

export const OgunInput = z.object({
  name: nonEmpty,
  saat: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  items: z.array(DietItemInput).default([]),
});

export const CreateDietInput = z.object({
  clientId: idParam,
  tarih: dateIso,
  notlar: z.string().optional().nullable(),
  oguns: z.array(OgunInput).min(1),
  templateId: idParam.optional(),
});

export type CreateDietInput = z.infer<typeof CreateDietInput>;
