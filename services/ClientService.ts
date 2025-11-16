import prisma from "@/lib/prisma";
import { Client } from "@prisma/client";
import { apiClient } from "@/lib/api-client";

const ClientService = {
  // Create a new client
  async createClient(clientData: {
    name: string;
    surname: string;
    birthdate?: Date | null;
    phoneNumber?: string;
    notes?: string;
    illness?: string;
    gender?: number | null;
  }) {
    try {
      const client = await prisma.client.create({
        data: {
          name: clientData.name,
          surname: clientData.surname,
          birthdate: clientData.birthdate,
          phoneNumber: clientData.phoneNumber,
          notes: clientData.notes,
          illness: clientData.illness,
          gender: clientData.gender,
        },
      });

      return client;
    } catch (error) {
      console.error("Error creating client:", error);
      throw error;
    }
  },

  // Get a client by ID
  async getClient(id: number) {
    try {
      const client = await prisma.client.findUnique({
        where: { id },
        include: {
          diets: {
            orderBy: { createdAt: "desc" },
          },
          bannedFoods: {
            include: {
              besin: true,
            },
          },
        },
      });

      return client;
    } catch (error) {
      console.error("Error getting client:", error);
      throw error;
    }
  },

  // Get all clients
  async getAllClients() {
    try {
      const clients = await prisma.client.findMany({
        orderBy: {
          surname: "asc",
        },
        include: {
          bannedFoods: {
            include: {
              besin: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return clients;
    } catch (error: any) {
      // Avoid using console.error with the error object directly
      console.error(
        "Error getting all clients: " + (error.message || "Unknown error")
      );
      throw error;
    }
  },

  // Update a client
  async updateClient(
    id: number,
    clientData: {
      name?: string;
      surname?: string;
      birthdate?: Date | null;
      phoneNumber?: string;
      notes?: string;
      gender?: number;
      illness?: string;
      bannedBesins?: { besinId: number; reason?: string | null }[];
    }
  ) {
    try {
      const { bannedBesins, ...otherData } = clientData;

      // First update the client's basic information
      const client = await prisma.client.update({
        where: { id },
        data: {
          ...otherData,
          // If birthdate is a string, convert it to Date
          birthdate: otherData.birthdate ? new Date(otherData.birthdate) : null,
        },
      });

      // If bannedBesins is provided, update them
      if (bannedBesins) {
        // First, remove all existing banned besins
        await prisma.bannedFood.deleteMany({
          where: { clientId: id },
        });

        // Then create new ones
        if (bannedBesins.length > 0) {
          await prisma.bannedFood.createMany({
            data: bannedBesins.map((ban) => ({
              clientId: id,
              besinId: ban.besinId,
              reason: ban.reason,
            })),
          });
        }
      }

      // Return the updated client with banned besins
      return await prisma.client.findUnique({
        where: { id },
        include: {
          bannedFoods: {
            include: {
              besin: true,
            },
          },
        },
      });
    } catch (error) {
      console.error("Error updating client:", error);
      throw error;
    }
  },

  // Delete a client
  async deleteClient(id: number) {
    try {
      const client = await prisma.client.delete({
        where: { id },
      });

      return client;
    } catch (error: any) {
      // Avoid using console.error with the error object directly
      console.error(
        "Error deleting client: " + (error.message || "Unknown error")
      );
      throw error;
    }
  },
};

export default ClientService;

export const fetchClients = async (params?: {
  skip?: number;
  take?: number;
  search?: string;
}): Promise<{
  clients: Client[];
  total: number;
  hasMore: boolean;
}> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) {
      queryParams.append("skip", params.skip.toString());
    }
    if (params?.take !== undefined) {
      queryParams.append("take", params.take.toString());
    }
    if (params?.search) {
      queryParams.append("search", params.search);
    }

    const url = `/clients${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    const data = await apiClient.get<{ clients: Client[]; total: number; hasMore: boolean }>(url);

    if (!data.clients || !Array.isArray(data.clients)) {
      throw new Error("Invalid data format received from server");
    }

    return {
      clients: data.clients,
      total: data.total,
      hasMore: data.hasMore,
    };
  } catch (error) {
    console.error("Error in fetchClients:", error);
    throw error;
  }
};
