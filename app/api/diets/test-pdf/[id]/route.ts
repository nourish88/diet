import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    return NextResponse.json({ 
      success: true, 
      message: "Test endpoint working",
      id: params.id 
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

