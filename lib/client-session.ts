import type { SupabaseClient } from "@supabase/supabase-js";
import { describeRequestError } from "./http-request";

type ClientAuth = Pick<SupabaseClient["auth"], "signInWithPassword" | "signUp">;

export async function ensureClientSession(auth: ClientAuth, email: string, password: string) {
  const credentials = { email, password };
  const signedIn = await auth.signInWithPassword(credentials);
  if (!signedIn.error && signedIn.data.session && signedIn.data.user) {
    return { session: signedIn.data.session, user: signedIn.data.user };
  }
  // A network/service failure is not evidence that the account does not exist.
  const invalidCredentials = signedIn.error?.code === "invalid_credentials" ||
    signedIn.error?.status === 400 && /invalid login credentials/i.test(signedIn.error.message);
  if (!invalidCredentials) throw new Error(describeRequestError(signedIn.error));

  const registration = await auth.signUp({ ...credentials, options: { data: { role: "client" } } });
  if (registration.error && !/already|registered/i.test(registration.error.message)) {
    throw new Error(describeRequestError(registration.error));
  }
  const retry = await auth.signInWithPassword(credentials);
  if (retry.error || !retry.data.session || !retry.data.user) {
    throw new Error(retry.error ? describeRequestError(retry.error) : "Danışan oturumu açılamadı. Lütfen tekrar deneyin.");
  }
  return { session: retry.data.session, user: retry.data.user };
}
