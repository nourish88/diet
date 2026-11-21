"use client";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { flushClientErrors, reportClientError, setErrorReporterSession } from "@/lib/application-error-client";

export default function ApplicationErrorProvider() {
  const { session } = useAuth();
  useEffect(() => {
    setErrorReporterSession(session?.user.id ?? null, session?.access_token ?? null);
    void flushClientErrors();
  }, [session]);
  useEffect(() => {
    const flush = () => { if (document.visibilityState === "visible") void flushClientErrors(); };
    const onError = (event: ErrorEvent) => reportClientError(event.error, { code: "javascript_error" });
    const onRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.name !== "AbortError") reportClientError(event.reason, { code: "javascript_error" });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", flush);
    const timer = setInterval(flush, 30000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, []);
  return null;
}
