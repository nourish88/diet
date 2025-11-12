import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { addCorsHeaders } from "@/lib/cors";
import { getClientsWithBirthdaysToday } from "@/services/BirthdayService";

/**
 * GET /api/birthdays/today
 * 
 * Returns clients with birthdays today (GMT+3)
 * - Auth: Dietitian only
 * - Returns: List of clients with birthdays today
 */
export async function GET(request: NextRequest) {
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

    // Get clients with birthdays today for this dietitian
    const birthdayClients = await getClientsWithBirthdaysToday(auth.user.id);

    // Format response
    const clients = birthdayClients.map((client) => ({
      id: client.id,
      name: client.name,
      surname: client.surname,
      phoneNumber: client.phoneNumber,
      birthdate: client.birthdate ? client.birthdate.toISOString() : null,
    }));

    return addCorsHeaders(
      NextResponse.json({
        success: true,
        clients,
        count: clients.length,
      })
    );
  } catch (error: any) {
    console.error("Error fetching birthday clients:", error);
    return addCorsHeaders(
      NextResponse.json(
        { error: "Failed to fetch birthday clients" },
        { status: 500 }
      )
    );
  }
}

