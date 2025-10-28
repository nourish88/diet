export function formatPhoneForWhatsApp(phoneNumber: string): string {
  // Remove all non-digit characters
  return phoneNumber.replace(/\D/g, "");
}

export function createWhatsAppMessage(
  clientName: string,
  dietDate: string
): string {
  return (
    `Merhaba ${clientName}! 👋\n\n` +
    `Yeni beslenme programınız hazır 📋\n\n` +
    `Tarih: ${dietDate}\n\n` +
    `Mobil uygulamadan detayları görebilirsiniz.`
  );
}

export function getWhatsAppURL(phoneNumber: string, message: string): string {
  const cleanPhone = formatPhoneForWhatsApp(phoneNumber);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

export function openWhatsApp(phoneNumber: string, message: string): string {
  const url = getWhatsAppURL(phoneNumber, message);

  // For web browsers
  if (typeof window !== "undefined") {
    window.open(url, "_blank");
    return url;
  }

  // For React Native (mobile)
  if (typeof window === "undefined" && typeof global !== "undefined") {
    // This will be handled by the mobile app using Linking
    return url;
  }

  return url;
}

