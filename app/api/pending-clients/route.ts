import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - List pending users
export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: "client",
        isApproved: false,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching pending users:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending users" },
      { status: 500 }
    );
  }
}

