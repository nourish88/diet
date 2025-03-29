import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const ClientService = {
  // Create a new client
  async createClient(clientData: {
    name: string;
    surname: string;
    birthdate?: Date | null;
    phoneNumber?: string;
    notes?: string;
  }) {
    try {
      const client = await prisma.client.create({
        data: {
          name: clientData.name,
          surname: clientData.surname,
          birthdate: clientData.birthdate,
          phoneNumber: clientData.phoneNumber,
          notes: clientData.notes,
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
      });

      return clients;
    } catch (error) {
      console.error("Error getting all clients:", error);
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
    }
  ) {
    try {
      const client = await prisma.client.update({
        where: { id },
        data: clientData,
      });

      return client;
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
    } catch (error) {
      console.error("Error deleting client:", error);
      throw error;
    }
  },
};

export default ClientService;
