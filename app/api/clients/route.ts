import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        name: true,
        surname: true,
        phoneNumber: true,  // Changed from phone to phoneNumber
        birthdate: true,
        createdAt: true,
        // Remove email as it doesn't exist in the schema
      }
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Veritabanı bağlantısında bir hata oluştu' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientData = await request.json();
    console.log("Received client data in API:", clientData);

    if (!clientData.name || !clientData.surname) {
      return NextResponse.json(
        { error: "İsim ve soyisim zorunludur" },
        { status: 400 }
      );
    }

    const { bannedBesins, ...clientDetails } = clientData;

    const transformedData = {
      ...clientDetails,
      birthdate:
        clientDetails.birthdate && clientDetails.birthdate !== "null"
          ? new Date(clientDetails.birthdate)
          : null,
    };

    console.log("Transformed data being sent to Prisma:", transformedData);

    const client = await prisma.client.create({
      data: {
        ...transformedData,
        bannedFoods: {
          create:
            bannedBesins?.map((ban: { besinId: number; reason?: string }) => ({
              besinId: ban.besinId,
              reason: ban.reason,
            })) || [],
        },
      },
      include: {
        bannedFoods: {
          include: {
            besin: true,
          },
        },
      },
    });

    console.log("Created client:", client);

    return NextResponse.json({ client }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating client:", error);
    
    // Return a proper JSON response for all errors
    return NextResponse.json(
      { 
        error: error.message || "Danışan oluşturulurken bir hata oluştu" 
      },
      { status: 500 }
    );
  }
}
