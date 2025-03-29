import { NextRequest, NextResponse } from "next/server";
import DietService from "@/services/DietService";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { clientId, dietData } = data;

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    if (!dietData) {
      return NextResponse.json(
        { error: "Diet data is required" },
        { status: 400 }
      );
    }

    const diet = await DietService.createDiet(clientId, dietData);

    return NextResponse.json({ diet }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating diet:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create diet" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");

    if (clientId) {
      const diets = await DietService.getClientDiets(Number(clientId));
      return NextResponse.json({ diets });
    }

    return NextResponse.json(
      { error: "Client ID is required" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error fetching diets:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch diets" },
      { status: 500 }
    );
  }
}
