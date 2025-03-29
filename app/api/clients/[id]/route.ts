import { NextRequest, NextResponse } from "next/server";
import ClientService from "@/services/ClientService";

// Fix: Use correct type imports from Next.js
import type { Route } from "next";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } } // This is correct
) {
  try {
    const id = await Promise.resolve(context.params.id);
    const clientId = Number(id);

    if (isNaN(clientId)) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }

    const client = await ClientService.getClient(clientId);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error: any) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch client" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = await Promise.resolve(context.params.id);
    const clientId = Number(id);

    if (isNaN(clientId)) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }

    const clientData = await request.json();

    // Convert birthdate string to Date if present
    if (clientData.birthdate) {
      clientData.birthdate = new Date(clientData.birthdate);
    }

    const client = await ClientService.updateClient(clientId, clientData);

    return NextResponse.json({ client });
  } catch (error: any) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update client" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = await Promise.resolve(context.params.id);
    const clientId = Number(id);

    if (isNaN(clientId)) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }

    await ClientService.deleteClient(clientId);

    return NextResponse.json(
      { message: "Client deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete client" },
      { status: 500 }
    );
  }
}
