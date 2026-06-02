import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase-server";

const DEFAULT_TAKE = 20;

export type ClientsListPage = {
  clients: Array<{
    id: number;
    name: string;
    surname: string;
    phoneNumber: string | null;
    birthdate: Date | null;
    createdAt: Date;
    gender: number | null;
  }>;
  total: number;
  hasMore: boolean;
};

export async function getServerDietitianId(): Promise<number | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, role: true, isApproved: true },
  });

  if (!dbUser || dbUser.role !== "dietitian" || !dbUser.isApproved) {
    return null;
  }
  return dbUser.id;
}

export async function fetchClientsListPage(
  dietitianId: number,
  options: { skip?: number; take?: number; search?: string } = {},
): Promise<ClientsListPage> {
  const skip = options.skip ?? 0;
  const take = options.take ?? DEFAULT_TAKE;
  const search = options.search?.trim() ?? "";

  const whereClause: Prisma.ClientWhereInput = { dietitianId };

  if (search) {
    const tokens = search.split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length > 0) {
      whereClause.AND = tokens.map((token) => ({
        OR: [
          { name: { contains: token, mode: "insensitive" } },
          { surname: { contains: token, mode: "insensitive" } },
          { phoneNumber: { contains: token, mode: "insensitive" } },
        ],
      }));
    }
  }

  const [total, clients] = await Promise.all([
    prisma.client.count({ where: whereClause }),
    prisma.client.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        surname: true,
        phoneNumber: true,
        birthdate: true,
        createdAt: true,
        gender: true,
      },
    }),
  ]);

  return {
    clients,
    total,
    hasMore: skip + take < total,
  };
}
