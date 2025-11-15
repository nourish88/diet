import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// Initialize Twilio client
const client = twilio(accountSid, authToken);

export class WhatsAppService {
  async sendDietPDF(phoneNumber: string, pdfBuffer: Buffer, dietDate: string) {
    try {
      // Format phone number (must include country code)
      const formattedPhone = `whatsapp:${phoneNumber}`;

      // For now, we'll use a simple text message
      // In production, you'd upload the PDF to a temporary URL
      const message = await client.messages.create({
        from: whatsappNumber || "whatsapp:+14155238886", // Your Twilio WhatsApp number
        to: formattedPhone,
        body: `Your diet plan for ${dietDate} is ready! 📋\n\nPlease check your mobile app for the complete diet plan.`,
      });

      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error("WhatsApp send error:", error);
      throw error;
    }
  }

  async sendReferenceCode(
    phoneNumber: string,
    referenceCode: string,
    clientName: string
  ) {
    try {
      const formattedPhone = `whatsapp:${phoneNumber}`;

      const message = await client.messages.create({
        from: whatsappNumber || "whatsapp:+14155238886",
        to: formattedPhone,
        body: `Hi ${clientName}! 👋\n\nYour reference code is: ${referenceCode}\n\nPlease send this code to your dietitian to activate your mobile app account.`,
      });

      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error("WhatsApp reference code send error:", error);
      throw error;
    }
  }

  // Future: Upload PDF to temporary storage and send as media
  private async uploadPDF(buffer: Buffer): Promise<string> {
    // This would upload the PDF to a temporary storage service
    // and return a public URL for WhatsApp media
    throw new Error("PDF upload not implemented yet");
  }
}

export const whatsappService = new WhatsAppService();




