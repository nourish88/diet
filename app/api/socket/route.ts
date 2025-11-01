import { NextRequest, NextResponse } from "next/server";

// Health check endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "API is running",
  });
}

