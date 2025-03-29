import { NextRequest, NextResponse } from "next/server";
import ClientService from "@/services/ClientService";

export async function POST(request: NextRequest) {
  try {
    const clientData = await request.json();

    if (!clientData.name || !clientData.surname) {
      return NextResponse.json(
        { error: "Name and surname are required" },
        { status: 400 }
      );
    }

    // Convert birthdate string to Date if present
    if (clientData.birthdate) {
      clientData.birthdate = new Date(clientData.birthdate);
    }

    const client = await ClientService.createClient(clientData);

    return NextResponse.json({ client }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create client" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const clients = await ClientService.getAllClients();
    return NextResponse.json({ clients });
  } catch (error: any) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
