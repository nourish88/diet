import { z } from "zod";

export const idParam = z.coerce.number().int().positive();

export const dateIso = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid ISO date");

export const phoneTr = z
  .string()
  .trim()
  .regex(/^(\+?90)?0?5\d{9}$/, "Geçersiz telefon numarası");

export const nonEmpty = z.string().trim().min(1);

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
