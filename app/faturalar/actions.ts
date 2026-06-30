"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getInvoices(filters?: { startDate?: string; endDate?: string; clientName?: string }) {
  const where: any = {};

  if (filters?.startDate && filters?.endDate) {
    const start = new Date(filters.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    
    where.date = {
      gte: start,
      lte: end,
    };
  }

  if (filters?.clientName) {
    where.client = {
      OR: [
        { name: { contains: filters.clientName, mode: "insensitive" } },
        { surname: { contains: filters.clientName, mode: "insensitive" } },
      ],
    };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      client: true,
    },
    orderBy: {
      date: "desc",
    },
  });

  return invoices;
}

export async function getInvoiceById(id: number) {
  return await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: {
        include: {
          billingInfo: true,
        },
      },
    },
  });
}

export async function getClientBillingInfo(clientId: number) {
  return await prisma.clientBillingInfo.findUnique({
    where: { clientId },
  });
}

export async function getClientsForSelect() {
  return await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      surname: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function createInvoice(data: any) {
  const { clientId, date, amountWithVat, billingInfo } = data;

  const vatRate = 20;
  const amountWithoutVat = amountWithVat / (1 + vatRate / 100);

  // Use a transaction to create invoice and upsert billing info
  const invoice = await prisma.$transaction(async (tx) => {
    // 1. Upsert ClientBillingInfo
    await tx.clientBillingInfo.upsert({
      where: { clientId: Number(clientId) },
      create: {
        clientId: Number(clientId),
        tcNo: billingInfo.tcNo || null,
        address: billingInfo.address || null,
        city: billingInfo.city || null,
        district: billingInfo.district || null,
        taxNo: billingInfo.taxNo || null,
      },
      update: {
        tcNo: billingInfo.tcNo || null,
        address: billingInfo.address || null,
        city: billingInfo.city || null,
        district: billingInfo.district || null,
        taxNo: billingInfo.taxNo || null,
      },
    });

    // 2. Create Invoice
    return await tx.invoice.create({
      data: {
        clientId: Number(clientId),
        date: new Date(date),
        subject: "Diyet",
        quantity: 1,
        vatRate,
        amountWithVat: Number(amountWithVat),
        amountWithoutVat: Number(amountWithoutVat),
      },
    });
  });

  revalidatePath("/faturalar");
  return invoice;
}

export async function updateInvoice(id: number, data: any) {
  const { date, amountWithVat, billingInfo, clientId } = data;

  const vatRate = 20;
  const amountWithoutVat = amountWithVat / (1 + vatRate / 100);

  const invoice = await prisma.$transaction(async (tx) => {
    // 1. Upsert/Update ClientBillingInfo
    await tx.clientBillingInfo.upsert({
      where: { clientId: Number(clientId) },
      create: {
        clientId: Number(clientId),
        tcNo: billingInfo.tcNo || null,
        address: billingInfo.address || null,
        city: billingInfo.city || null,
        district: billingInfo.district || null,
        taxNo: billingInfo.taxNo || null,
      },
      update: {
        tcNo: billingInfo.tcNo || null,
        address: billingInfo.address || null,
        city: billingInfo.city || null,
        district: billingInfo.district || null,
        taxNo: billingInfo.taxNo || null,
      },
    });

    // 2. Update Invoice
    return await tx.invoice.update({
      where: { id },
      data: {
        date: new Date(date),
        amountWithVat: Number(amountWithVat),
        amountWithoutVat: Number(amountWithoutVat),
      },
    });
  });

  revalidatePath("/faturalar");
  return invoice;
}

export async function deleteInvoice(id: number) {
  await prisma.invoice.delete({
    where: { id },
  });
  revalidatePath("/faturalar");
}
