import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const twentyOneDaysAgo = new Date();
    twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);

    // 1. Find client IDs who have a diet created in the last 21 days
    const activeClients = await prisma.diet.groupBy({
      by: ['clientId'],
      where: {
        createdAt: {
          gte: twentyOneDaysAgo
        }
      }
    });

    const activeClientIds = activeClients.map(c => c.clientId);

    // 2. Begin transaction to ensure consistency
    await prisma.$transaction([
      // Set everyone NOT in activeClientIds to false
      prisma.client.updateMany({
        where: {
          id: { notIn: activeClientIds }
        },
        data: { isActive: false }
      }),
      // Set everyone IN activeClientIds to true
      prisma.client.updateMany({
        where: {
          id: { in: activeClientIds }
        },
        data: { isActive: true }
      })
    ]);

    return NextResponse.json({ 
      success: true, 
      activeCount: activeClientIds.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Cron Error: Failed to update active clients", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
