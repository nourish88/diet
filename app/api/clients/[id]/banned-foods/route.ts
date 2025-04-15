import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = parseInt(params.id, 10);

    if (isNaN(clientId)) {
      return new NextResponse(JSON.stringify({ error: "Invalid client ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const bannedFoods = await prisma.bannedFood.findMany({
      where: {
        clientId: clientId,
      },
      include: {
        besin: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return new NextResponse(JSON.stringify({ bannedFoods }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    // Avoid using console.error with the error object directly
    console.error(
      "Error fetching banned foods: " + (error.message || "Unknown error")
    );
    return new NextResponse(
      JSON.stringify({ error: "Failed to fetch banned foods" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = parseInt(params.id, 10);

    if (isNaN(clientId)) {
      return new NextResponse(JSON.stringify({ error: "Invalid client ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let validBesins = [];
    try {
      const { bannedBesins } = await request.json();

      // Ensure bannedBesins is an array
      const besinsArray = Array.isArray(bannedBesins) ? bannedBesins : [];

      // Filter out any invalid entries and ensure besinId is a number
      validBesins = besinsArray
        .filter((item) => item && typeof item === "object" && "besinId" in item)
        .map((item) => ({
          ...item,
          besinId:
            typeof item.besinId === "string"
              ? parseInt(item.besinId, 10)
              : item.besinId,
        }))
        .filter((item) => !isNaN(item.besinId));

      console.log("Valid besins:", validBesins);
    } catch (error) {
      // Avoid using console.error with the error object directly
      console.error(
        "Error processing bannedBesins: " + (error.message || "Unknown error")
      );
    }

    // Delete existing banned foods for this client
    await prisma.bannedFood.deleteMany({
      where: {
        clientId: clientId,
      },
    });

    // Add new banned foods
    const createdBannedFoods = [];

    // Create banned foods one by one to better handle errors
    for (const banned of validBesins) {
      try {
        if (
          !banned ||
          typeof banned.besinId !== "number" ||
          isNaN(banned.besinId)
        ) {
          console.warn("Invalid banned food entry:", banned);
          continue;
        }

        const createdBannedFood = await prisma.bannedFood.create({
          data: {
            clientId: clientId,
            besinId: banned.besinId,
            reason: banned.reason || null,
          },
          include: {
            besin: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        createdBannedFoods.push(createdBannedFood);
      } catch (error) {
        // Avoid using console.error with the error object directly
        console.error(
          `Error creating banned food for besinId ${banned.besinId}: ` +
            ((error as any).message || "Unknown error")
        );
        // Continue with other banned foods even if one fails
      }
    }

    return new NextResponse(
      JSON.stringify({ bannedFoods: createdBannedFoods }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    // Avoid using console.error with the error object directly
    console.error(
      "Error updating banned foods: " + (error.message || "Unknown error")
    );
    return new NextResponse(
      JSON.stringify({ error: "Failed to update banned foods" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = parseInt(params.id, 10);

    if (isNaN(clientId)) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }

    // Delete all banned foods for this client
    await prisma.bannedFood.deleteMany({
      where: {
        clientId: clientId,
      },
    });

    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    // Avoid using console.error with the error object directly
    console.error(
      "Error deleting banned foods: " + (error.message || "Unknown error")
    );
    return new NextResponse(
      JSON.stringify({ error: "Failed to delete banned foods" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
