export function formatPhoneForWhatsApp(phoneNumber: string): string {
  // Log original phone number for debugging
  console.log("📞 Original phone number:", phoneNumber);

  // Remove all non-digit characters
  let cleanPhone = phoneNumber.replace(/\D/g, "");

  console.log("📞 Cleaned phone number:", cleanPhone);

  // Handle Turkish phone numbers
  // Turkish numbers can come in various formats:
  // - +90 533 310 49 70 -> 905333104970 (already correct)
  // - 90 533 310 49 70 -> 905333104970 (already correct)
  // - 0 533 310 49 70 -> 905333104970 (remove leading 0, add 90)
  // - 533 310 49 70 -> 905333104970 (add 90 prefix)
  // - +5... -> corrupted format (missing 9 after +), should be +90...

  // If phone starts with +5 (corrupted +90), it might be missing the 9
  // Original: +5333104970 -> cleaned: 5333104970 -> should be: 905333104970
  if (cleanPhone.startsWith("5")) {
    // Turkish mobile numbers start with 5 (e.g., 533, 534, 535)
    // Add 90 prefix for Turkish numbers
    cleanPhone = "90" + cleanPhone;
    console.log("📞 Added 90 prefix (starts with 5):", cleanPhone);
  } else if (cleanPhone.startsWith("0")) {
    // Remove leading 0 and add 90
    cleanPhone = "90" + cleanPhone.substring(1);
    console.log("📞 Removed leading 0 and added 90:", cleanPhone);
  } else if (!cleanPhone.startsWith("90")) {
    // If doesn't start with 90 and is 10 digits, likely Turkish number missing country code
    if (cleanPhone.length === 10) {
      cleanPhone = "90" + cleanPhone;
      console.log("📞 Added 90 prefix (10 digits):", cleanPhone);
    }
  }

  console.log("📞 Final formatted phone:", cleanPhone);
  return cleanPhone;
}

export function createWhatsAppMessage(
  clientName: string,
  dietDate: string
): string {
  return `Merhaba ${clientName}, ${dietDate} tarihindeki diyetiniz ektedir. Diyetinizle ilgili diyetisyeninizle iletişime geçmekten çekinmeyiniz.`;
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
