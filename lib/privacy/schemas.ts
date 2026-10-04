import { z } from "zod";
import { PRIVACY_REQUEST_KINDS } from "@/lib/kvkk-consent-config";

const fact = z.string().trim().min(10).max(10000);
export const PublishPolicySchema = z.object({
  version: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/),
  controllerName: z.string().trim().min(3).max(300),
  controllerAddress: fact,
  contactEmail: z.string().trim().email().max(254),
  collectionMethods: fact,
  processingDetails: fact,
  recipients: fact,
  internationalTransfers: fact,
  retentionPolicy: fact,
  healthDataCategories: fact,
  healthPurpose: fact,
  healthLegalBasis: z.enum(["explicit_consent", "healthcare"]),
  healthLegalJustification: fact,
  refusalConsequences: fact,
  reviewReference: z.string().trim().min(5).max(500),
  reviewed: z.literal(true),
}).strict();
export type PublishPolicyInput = z.infer<typeof PublishPolicySchema>;

export const ConsentDecisionSchema = z.object({
  policyId: z.string().uuid(),
  documentHash: z.string().regex(/^[a-f0-9]{64}$/),
  action: z.enum(["notice_acknowledged", "granted", "declined", "withdrawn"]),
  affirmed: z.literal(true),
  requestId: z.string().uuid(),
  channel: z.enum(["web", "mobile"]).default("web"),
}).strict();

export const PrivacyRequestSchema = z.object({
  requestId: z.string().uuid(),
  kind: z.enum(Object.keys(PRIVACY_REQUEST_KINDS) as [keyof typeof PRIVACY_REQUEST_KINDS, ...Array<keyof typeof PRIVACY_REQUEST_KINDS>]),
  fullName: z.string().trim().min(3).max(300),
  nationality: z.string().trim().min(2).max(100),
  identityNumber: z.string().trim().min(5).max(30).regex(/^[A-Za-z0-9]+$/),
  contactAddress: fact,
  detail: z.string().trim().min(10).max(5000),
}).strict().superRefine((data, ctx) => {
  if (["tr", "türkiye", "türk", "turkiye"].includes(data.nationality.toLowerCase()) && !/^[1-9][0-9]{10}$/.test(data.identityNumber)) {
    ctx.addIssue({ code: "custom", path: ["identityNumber"], message: "T.C. kimlik numarası 11 haneli olmalıdır." });
  }
});
export const RespondPrivacyRequestSchema = z.object({
  status: z.enum(["identity_required", "under_review", "fulfilled", "rejected"]),
  message: z.string().trim().min(10).max(10000),
  identityVerified: z.boolean().default(false),
  completionReference: z.string().trim().max(2000).optional(),
}).strict();
