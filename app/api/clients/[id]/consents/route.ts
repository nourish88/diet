import { route, HttpError } from "@/lib/api/handler";
import { requireOwnClient } from "@/lib/api-auth";
import { requirePrivacyOwner } from "@/lib/privacy/service";
import { consentReport } from "@/lib/privacy/reports";
import { privacyV2Enabled } from "@/lib/privacy/rollout";

export const dynamic = "force-dynamic";
export const GET = route<undefined, { id: string }>({
  cors: true,
  auth: "dietitian", scope: "privacy.client.consents",
  handler: async ({ request, params, auth }) => {
    if (privacyV2Enabled()) requirePrivacyOwner(auth);
    if (!/^[1-9][0-9]*$/.test(params.id) || !Number.isSafeInteger(Number(params.id))) throw new HttpError("bad_request", "Geçersiz danışan kimliği.");
    const clientId = Number(params.id);
    if (!(await requireOwnClient(clientId, auth))) throw new HttpError("not_found", "Danışan bulunamadı.");
    return consentReport(request, auth, clientId);
  },
});
