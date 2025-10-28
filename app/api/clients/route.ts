import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get("skip") || "0");
    const take = parseInt(searchParams.get("take") || "20");
    const search = searchParams.get("search") || "";
    const dietitianId = searchParams.get("dietitianId");

    // Build the where clause for search and dietitian filter
    const whereClause: any = {};

    // Add dietitian filter if provided (for mobile app)
    if (dietitianId) {
      whereClause.dietitianId = parseInt(dietitianId);
    }

    // Add search filter if provided
    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
        {
          surname: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
        {
          phoneNumber: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      ];
    }

    // Get total count for pagination
    const total = await prisma.client.count({
      where: whereClause,
    });

    // Get paginated clients
    const clients = await prisma.client.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        surname: true,
        phoneNumber: true,
        birthdate: true,
        createdAt: true,
        gender: true,
      },
    });

    const hasMore = skip + take < total;

    return NextResponse.json({
      clients,
      total,
      hasMore,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Veritabanı bağlantısında bir hata oluştu" },
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
        error: error.message || "Danışan oluşturulurken bir hata oluştu",
      },
      { status: 500 }
    );
  }
}
