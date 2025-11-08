import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface BannedBesinInput {
  besinId: number;
  reason: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clientId = parseInt(id, 10);

    if (isNaN(clientId)) {
      return new NextResponse(JSON.stringify({ error: "Invalid client ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let validBesins: BannedBesinInput[] = [];
    try {
      const { bannedBesins } = await request.json();

      // Ensure bannedBesins is an array
      const besinsArray = Array.isArray(bannedBesins) ? bannedBesins : [];

      // Filter out any invalid entries and ensure besinId is a number
      validBesins = besinsArray
        .filter(
          (item): item is { besinId: number | string; reason?: string } =>
            item && typeof item === "object" && "besinId" in item
        )
        .map((item) => ({
          besinId:
            typeof item.besinId === "string"
              ? parseInt(item.besinId, 10)
              : item.besinId,
          reason: item.reason,
        }))
        .filter(
          (item): item is BannedBesinInput =>
            typeof item.besinId === "number" && !isNaN(item.besinId)
        );

      console.log("Valid besins:", validBesins);
    } catch (error) {
      console.error(
        "Error processing bannedBesins: " +
          ((error as Error).message || "Unknown error")
      );
    }

    // Delete existing banned foods for this client
    await prisma.bannedFood.deleteMany({
      where: {
        clientId: clientId,
      },
    });

    // Add new banned foods
    const createdBannedFoods: Array<{
      id: number;
      createdAt: Date;
      updatedAt: Date;
      clientId: number;
      besinId: number;
      reason: string | null;
      besin: {
        id: number;
        name: string;
      };
    }> = [];

    // Create banned foods one by one to better handle errors
    for (const banned of validBesins) {
      try {
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

        createdBannedFoods.push(createdBannedFood as any);
      } catch (error) {
        console.error(
          `Error creating banned food for besinId ${banned.besinId}: ` +
            ((error as Error).message || "Unknown error")
        );
      }
    }

    return new NextResponse(
      JSON.stringify({ bannedFoods: createdBannedFoods }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(
      "Error updating banned foods: " +
        ((error as Error).message || "Unknown error")
    );
    return new NextResponse(
      JSON.stringify({ error: "Failed to update banned foods" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
