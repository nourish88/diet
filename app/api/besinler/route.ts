import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const besins = await prisma.besin.findMany({
      include: {
        besinGroup: true, // Make sure we're including the group relation
      },
      orderBy: {
        name: "asc",
      },
    });
    console.log(besins, "besssssss");
    return NextResponse.json(besins);
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Veritabanı bağlantısında bir hata oluştu" },
      { status: 500 }
    );
  }
}
