import type { Instrumentation } from "next";

/** Capture unhandled server/route errors as well as errors handled by our API wrapper. */
export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [{ default: prisma }, { persistApplicationError }, { classifyError }] = await Promise.all([
      import("@/lib/prisma"), import("@/lib/application-error-server"), import("@/lib/application-errors"),
    ]);
    await persistApplicationError(prisma, { code: classifyError(error), path: request.path, status: 500 });
  }
};
