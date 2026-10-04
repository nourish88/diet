import { route } from "@/lib/api/handler";
import { consentReport } from "@/lib/privacy/reports";

export const dynamic = "force-dynamic";
export const GET = route({ cors: true, auth: "dietitian", scope: "privacy.consents", handler: ({ request, auth }) => consentReport(request, auth) });
