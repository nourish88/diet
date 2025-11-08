import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const metric = await request.json();
    console.log("📊 Web Vitals metric received:", metric);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Failed to store web vitals metric:", error);
    return NextResponse.json(
      { error: error.message || "Failed to record metric" },
      { status: 500 }
    );
  }
}

