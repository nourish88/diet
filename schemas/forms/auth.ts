import { z } from "zod";

export const loginForm = z.object({
  email: z.string().email("Geçerli bir e-posta giriniz"),
  password: z.string().min(8, "En az 8 karakter"),
});
export type LoginForm = z.infer<typeof loginForm>;

export const usernameForm = z.object({
  username: z.string().min(2, "En az 2 karakter"),
});
