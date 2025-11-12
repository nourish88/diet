import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";
import {
  formatBirthdayMessage,
  generateWhatsAppURL,
  getClientsWithBirthdaysToday,
} from "@/services/BirthdayService";
import prisma from "@/lib/prisma";
import { z } from "zod";

const whatsappRequestSchema = z.object({
  clientId: z.number().int().positive(),
  phoneNumber: z.string().min(1),
});

/**
 * POST /api/birthdays/whatsapp
 * 
 * Generate WhatsApp deep link URL for birthday message
 * - Auth: Dietitian only
 * - Request Body: { clientId: number, phoneNumber: string }
 * - Returns: WhatsApp URL with pre-filled message
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);

    if (!auth.user) {
      return addCorsHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    if (auth.user.role !== "dietitian") {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Only dietitians can access this resource" },
          { status: 403 }
        )
      );
    }

    const body = await request.json();
    const validatedData = whatsappRequestSchema.parse(body);

    // Verify client belongs to this dietitian and has birthday today
    const birthdayClients = await getClientsWithBirthdaysToday(auth.user.id);
    const client = birthdayClients.find((c) => c.id === validatedData.clientId);

    if (!client) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Client not found or not a birthday client" },
          { status: 404 }
        )
      );
    }

    // Verify phone number matches
    if (client.phoneNumber !== validatedData.phoneNumber) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Phone number does not match client" },
          { status: 400 }
        )
      );
    }

    // Format birthday message
    const message = formatBirthdayMessage(client.name);

    // Generate WhatsApp URL
    const whatsappUrl = generateWhatsAppURL(validatedData.phoneNumber, message);

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        whatsappUrl,
        message,
        clientName: client.name,
      })
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Invalid request data", details: error.errors },
          { status: 400 }
        )
      );
    }

    console.error("Error generating WhatsApp URL:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to generate WhatsApp URL" },
        { status: 500 }
      )
    );
  }
}

