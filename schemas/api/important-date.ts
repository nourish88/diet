import { z } from "zod";
import { dateIso, nonEmpty } from "../shared/primitives";

export const ImportantDateInput = z.object({
  name: nonEmpty,
  message: nonEmpty,
  startDate: dateIso,
  endDate: dateIso,
});

export type ImportantDateInput = z.infer<typeof ImportantDateInput>;
