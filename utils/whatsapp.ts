export function formatPhoneForWhatsApp(phoneNumber: string): string {
  // Remove all non-digit characters
  return phoneNumber.replace(/\D/g, "");
}

export function createWhatsAppMessage(
  clientName: string,
  dietDate: string,
  dietDetailUrl?: string
): string {
  let message = `Merhaba ${clientName}, ${dietDate} tarihindeki diyetiniz ektedir. Diyetinizle ilgili diyetisyeninizle iletişime geçmekten çekinmeyiniz.`;
  
  if (dietDetailUrl) {
    message += `\n\nDetaylar için: ${dietDetailUrl}`;
  }
  
  return message;
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

