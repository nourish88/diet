"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  QrCode,
  Send,
  Share2,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { generateQRCode } from "@/lib/brosur-generator";
import { GOOGLE_REVIEW_URL, REVIEW_SHARE_TEXT } from "@/lib/site-urls";

const REVIEW_DONE_KEY = "client_review_done";

export default function ClientReviewPage() {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const shareMessage = useMemo(
    () => `${REVIEW_SHARE_TEXT}\n${GOOGLE_REVIEW_URL}`,
    []
  );
  const whatsappUrl = useMemo(
    () => `https://wa.me/?text=${encodeURIComponent(shareMessage)}`,
    [shareMessage]
  );

  useEffect(() => {
    generateQRCode(GOOGLE_REVIEW_URL, 280)
      .then(setQrDataUrl)
      .catch(() => {
        toast({
          title: "QR kod hazırlanamadı",
          description: "Yorum bağlantısını butonlardan paylaşabilirsiniz.",
          variant: "destructive",
        });
      });
  }, [toast]);

  const markReviewClicked = () => {
    try {
      localStorage.setItem(REVIEW_DONE_KEY, "clicked");
    } catch {}
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_REVIEW_URL);
      setCopied(true);
      toast({
        title: "Bağlantı kopyalandı",
        description: "Google yorum linkini istediğiniz yerde paylaşabilirsiniz.",
      });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({
        title: "Kopyalanamadı",
        description: "Tarayıcı izin vermedi. Linki doğrudan açabilirsiniz.",
        variant: "destructive",
      });
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      await handleCopy();
      return;
    }

    try {
      await navigator.share({
        title: "Google yorumu",
        text: REVIEW_SHARE_TEXT,
        url: GOOGLE_REVIEW_URL,
      });
    } catch {
      // User cancelled the share sheet.
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Deneyiminizi Paylaşın
        </h1>
        <p className="text-muted-foreground mt-1">
          Yorumunuz, doğru diyetisyeni arayan kişilere güven verir.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader>
            <div className="w-11 h-11 rounded-xl bg-warning/15 flex items-center justify-center mb-2">
              <Star className="w-5 h-5 text-warning" />
            </div>
            <CardTitle>Google'da yorum bırakın</CardTitle>
            <CardDescription>
              Butona dokunduğunuzda Google yorum ekranı açılır. 1-2 cümle bile
              yeterli.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full bg-warning hover:bg-warning/90 text-warning-foreground">
              <a
                href={GOOGLE_REVIEW_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={markReviewClicked}
              >
                <Star className="w-4 h-4 mr-2" />
                Google'da Değerlendir
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleNativeShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Paylaş
              </Button>
              <Button variant="outline" asChild>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </a>
              </Button>
            </div>

            <Button variant="ghost" className="w-full" onClick={handleCopy}>
              {copied ? (
                <Check className="w-4 h-4 mr-2 text-success" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              {copied ? "Kopyalandı" : "Linki Kopyala"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR ile aç
            </CardTitle>
            <CardDescription>
              Yakınınızdaki biri kamerayla tarayıp yorum sayfasına gidebilir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-square max-w-[280px] mx-auto rounded-2xl border bg-white p-4 flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Google yorum QR kodu"
                  className="w-full h-full object-contain"
                />
              ) : (
                <QrCode className="w-20 h-20 text-muted-foreground animate-pulse" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-soft flex items-center justify-center shrink-0">
              <Send className="w-4 h-4 text-brand" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">
                Arkadaşınıza da önerebilirsiniz
              </p>
              <p className="text-sm text-muted-foreground">
                Paylaş butonu, cihazınızın paylaşım ekranını açar. WhatsApp
                butonu ise hazır mesajla gönderim yapmanızı sağlar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
