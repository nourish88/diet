import { NextResponse } from "next/server";
import { getCachedBirims } from "@/lib/cache";

export async function GET() {
  try {
    const birims = await getCachedBirims();
    return NextResponse.json(birims);
  } catch (error) {
    console.error("Error fetching birims:", error);
    return NextResponse.json(
      { error: "Failed to fetch birims" },
      { status: 500 }
    );
  }
}
