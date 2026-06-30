"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getActiveClients() {
  const clients = await prisma.client.findMany({
    where: { isActive: true },
    include: {
      diets: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          createdAt: true
        }
      }
    },
    orderBy: { name: "asc" }
  });
  
  return clients;
}

export async function toggleClientOnlineStatus(clientId: number, isOnline: boolean) {
  await prisma.client.update({
    where: { id: clientId },
    data: { isOnline }
  });
  
  revalidatePath("/aktif-danisanlar");
}
