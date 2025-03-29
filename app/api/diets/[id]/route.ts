import { NextRequest, NextResponse } from "next/server";
import DietService from "@/services/DietService";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dietId = Number(params.id);

    if (isNaN(dietId)) {
      return NextResponse.json({ error: "Invalid diet ID" }, { status: 400 });
    }

    const diet = await DietService.getDiet(dietId);

    if (!diet) {
      return NextResponse.json({ error: "Diet not found" }, { status: 404 });
    }

    return NextResponse.json({ diet });
  } catch (error: any) {
    console.error("Error fetching diet:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch diet" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dietId = Number(params.id);

    if (isNaN(dietId)) {
      return NextResponse.json({ error: "Invalid diet ID" }, { status: 400 });
    }

    await DietService.deleteDiet(dietId);

    return NextResponse.json(
      { message: "Diet deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting diet:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete diet" },
      { status: 500 }
    );
  }
}
