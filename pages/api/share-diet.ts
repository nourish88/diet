import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { phoneNumber, clientName, dietDate } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    // Format phone number (remove spaces, +, etc.)
    let formattedPhone = phoneNumber.replace(/\D/g, "");

    // If it doesn't start with country code, add Turkish code
    if (!formattedPhone.startsWith("90")) {
      formattedPhone = `90${formattedPhone}`;
    }

    // Create a message
    const message = encodeURIComponent(
      `Merhaba ${clientName || "Danışanım"},\n\n` +
        `${
          dietDate ? new Date(dietDate).toLocaleDateString("tr-TR") : "Bugün"
        } tarihli beslenme programınızı ekte bulabilirsiniz.\n\n` +
        `Sağlıklı günler dilerim,\n` +
        `Dyt. Ezgi Evgin Aktaş`
    );

    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;

    return res.status(200).json({
      success: true,
      whatsappUrl,
    });
  } catch (error) {
    console.error("Error in share-diet API:", error);
    return res.status(500).json({
      error: "Failed to create WhatsApp sharing link",
    });
  }
}
