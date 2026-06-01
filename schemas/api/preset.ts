import { z } from "zod";
import { nonEmpty } from "../shared/primitives";

const PresetItemInput = z.object({
  besinName: z.string().optional(),
  besin: z.string().optional(),
  miktar: z.string().optional().default(""),
  birim: z.string().optional().default(""),
});

export const CreatePresetInput = z.object({
  name: nonEmpty,
  mealType: z.string().nullable().optional(),
  items: z.array(PresetItemInput).optional().default([]),
});
export type CreatePresetInput = z.infer<typeof CreatePresetInput>;
