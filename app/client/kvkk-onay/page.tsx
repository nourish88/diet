"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import {
  KVKK_PORTAL_CONSENT_VERSION,
  KVKK_PORTAL_SUMMARY_PARAGRAPHS,
  getKvkkInfoPageUrl,
} from "@/lib/kvkk-consent-config";
import { ExternalLink, Loader2, Shield } from "lucide-react";

export default function ClientKvkkOnayPage() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const infoUrl = getKvkkInfoPageUrl();

  const submit = async () => {
    if (!accepted) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post<{ success: boolean }>("/client/consent/kvkk", {
        consentVersion: KVKK_PORTAL_CONSENT_VERSION,
        channel: "web",
      });
      router.replace("/client");
      router.refresh();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Onay kaydedilemedi. Tekrar deneyin.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-8">
      <Card className="w-full max-w-lg shadow-xl border-blue-100">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <Shield className="w-7 h-7 text-blue-700" />
          </div>
          <CardTitle className="text-xl md:text-2xl">
            KVKK ve açık rıza onayı
          </CardTitle>
          <CardDescription>
            Devam etmek için bilgilendirmeyi okuyup onaylamanız gerekir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="max-h-48 overflow-y-auto rounded-lg border bg-white/80 p-4 text-sm text-gray-700 space-y-3">
            {KVKK_PORTAL_SUMMARY_PARAGRAPHS.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <a
            href={infoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:underline"
          >
            Aydınlatma metni ve KVKK politikası
            <ExternalLink className="w-4 h-4" />
          </a>

          <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50/80 p-3">
            <input
              id="kvkk-accept"
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="kvkk-accept" className="text-sm leading-snug cursor-pointer font-normal">
              Aydınlatma metnini okudum; sağlık ve beslenme verilerimin
              diyetisyenim tarafından danışmanlık hizmeti kapsamında işlenmesine{" "}
              <strong>açık rıza</strong> veriyorum. Sürüm:{" "}
              {KVKK_PORTAL_CONSENT_VERSION}
            </Label>
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center" role="alert">
              {error}
            </p>
          )}

          <Button
            className="w-full h-12 min-h-[44px]"
            disabled={!accepted || submitting}
            onClick={submit}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Kaydediliyor…
              </>
            ) : (
              "Onaylıyorum ve devam ediyorum"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Sorunuz varsa diyetisyeninizle iletişime geçebilirsiniz.{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Çıkış
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
