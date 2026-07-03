import { normalizeClientPhoneNumber } from "@/lib/phone-normalize";

function cleanPhoneInput(phoneNumber: string): string {
  return phoneNumber
    .normalize("NFKC")
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .trim();
}

export function formatPhoneForWhatsApp(phoneNumber: string): string {
  const cleanedInput = cleanPhoneInput(phoneNumber);
  let digits = cleanedInput.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("0090")) {
    digits = digits.slice(2);
  }

  if (/^9005\d{9}$/.test(digits)) {
    return `90${digits.slice(3)}`;
  }

  if (/^05\d{9}$/.test(digits)) {
    return `90${digits.slice(1)}`;
  }

  if (/^5\d{9}$/.test(digits)) {
    return `90${digits}`;
  }

  if (/^90\d{10}$/.test(digits)) {
    return digits;
  }

  const normalized = normalizeClientPhoneNumber(cleanedInput);
  if (normalized) {
    return normalized.replace(/^\+/, "");
  }

  return digits;
}

export function createWhatsAppMessage(
  clientName: string,
  dietDate: string,
  dietUrl?: string
): string {
  const linkText = dietUrl
    ? `\n\nBeslenme programınızı bu linkten görüntüleyip PDF olarak indirebilirsiniz:\n${dietUrl}`
    : "";
  return `Merhaba ${clientName}, ${dietDate} tarihindeki beslenme programınız hazır.${linkText}\n\nDiyetinizle ilgili diyetisyeninizle iletişime geçmekten çekinmeyiniz.`;
}

export function getWhatsAppURL(phoneNumber: string, message: string): string {
  const cleanPhone = formatPhoneForWhatsApp(phoneNumber);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Detect if the page is running as an installed PWA (standalone mode)
 */
export function isPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

/**
 * Open WhatsApp with a pre-filled message.
 * - PWA/mobile: uses whatsapp:// deep link to open native app directly
 * - Web browser: opens wa.me link in a new tab (WhatsApp Web)
 */
export function openWhatsApp(phoneNumber: string, message: string): string {
  const cleanPhone = formatPhoneForWhatsApp(phoneNumber);
  const encodedMessage = encodeURIComponent(message);

  if (typeof window !== "undefined") {
    if (isPWA()) {
      // PWA: open native WhatsApp app directly
      const nativeUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
      window.location.href = nativeUrl;
      return nativeUrl;
    } else {
      // Web: open WhatsApp Web in new tab
      const webUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      window.open(webUrl, "_blank");
      return webUrl;
    }
  }

  return getWhatsAppURL(phoneNumber, message);
}
