import { z } from "zod";
import { dateIso } from "../shared/primitives";

const intLike = z.coerce.number().int().nonnegative();

export const CreateExerciseLogInput = z.object({
  date: dateIso,
  exerciseTypeId: intLike.nullable().optional(),
  description: z.string().nullable().optional(),
  duration: intLike.nullable().optional(),
  steps: intLike.nullable().optional(),
});
export type CreateExerciseLogInput = z.infer<typeof CreateExerciseLogInput>;

export const UpdateExerciseLogInput = CreateExerciseLogInput.partial();
export type UpdateExerciseLogInput = z.infer<typeof UpdateExerciseLogInput>;
