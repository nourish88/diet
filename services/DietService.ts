import { Diet as DietType } from "../types/types";
import prisma from "../lib/prisma";

export const DietService = {
  // Create a new diet with all related data
  async createDiet(clientId: number, dietData: DietType) {
    try {
      const diet = await prisma.diet.create({
        data: {
          clientId,
          tarih: dietData.Tarih ? new Date(dietData.Tarih) : null,
          su: dietData.Su,
          sonuc: dietData.Sonuc,
          hedef: dietData.Hedef,
          fizik: dietData.Fizik,
          isBirthdayCelebration: dietData.isBirthdayCelebration || false,
          isImportantDateCelebrated:
            dietData.isImportantDateCelebrated || false,
          importantDateId: dietData.importantDateId || null,
          // Create the oguns and menu items in a nested create
          oguns: {
            create: dietData.Oguns.map((ogun) => ({
              name: ogun.name,
              time: ogun.time,
              detail: ogun.detail,
              order: ogun.order,
              items: {
                create: ogun.items
                  .filter(
                    (item) =>
                      item.besin &&
                      (typeof item.besin === "string"
                        ? item.besin.trim() !== ""
                        : item.besin.name?.trim() !== "")
                  )
                  .map((item) => ({
                    miktar: item.miktar,
                    besin: {
                      connectOrCreate: {
                        where: {
                          name:
                            typeof item.besin === "string"
                              ? item.besin
                              : item.besin.name || "",
                        },
                        create: {
                          name:
                            typeof item.besin === "string"
                              ? item.besin
                              : item.besin.name || "",
                        },
                      },
                    },
                    ...(item.birim &&
                    (typeof item.birim === "string"
                      ? item.birim.trim() !== ""
                      : item.birim.name?.trim() !== "")
                      ? {
                          birim: {
                            connectOrCreate: {
                              where: {
                                name:
                                  typeof item.birim === "string"
                                    ? item.birim
                                    : item.birim.name || "",
                              },
                              create: {
                                name:
                                  typeof item.birim === "string"
                                    ? item.birim
                                    : item.birim.name || "",
                              },
                            },
                          },
                        }
                      : {}),
                  })),
              },
            })),
          },
        },
        include: {
          oguns: {
            include: {
              items: {
                include: {
                  besin: true,
                  birim: true,
                },
              },
            },
          },
          client: true,
        },
      });

      return diet;
    } catch (error) {
      console.error("Error creating diet:", error);
      throw error;
    }
  },

  // Get a single diet by id with all related data
  async getDiet(id: number) {
    try {
      const diet = await prisma.diet.findUnique({
        where: { id },
        include: {
          oguns: {
            orderBy: {
              id: "asc", // Now this will work
            },
            include: {
              items: {
                include: {
                  besin: true,
                  birim: true,
                },
              },
            },
          },
          client: true,
        },
      });

      return diet;
    } catch (error) {
      console.error("Error getting diet:", error);
      throw error;
    }
  },

  // Get all diets for a specific client
  async getClientDiets(clientId: number) {
    try {
      const diets = await prisma.diet.findMany({
        where: { clientId },
        orderBy: { createdAt: "desc" },
        include: {
          oguns: {
            orderBy: {
              id: "asc", // Now this will work
            },
            include: {
              items: {
                include: {
                  besin: true,
                  birim: true,
                },
              },
            },
          },
        },
      });

      return diets;
    } catch (error) {
      console.error("Error getting client diets:", error);
      throw error;
    }
  },

  // Delete a diet
  async deleteDiet(id: number) {
    try {
      // First, delete associated ogun items
      await prisma.menuItem.deleteMany({
        where: {
          ogun: {
            dietId: id,
          },
        },
      });

      // Then delete the oguns
      await prisma.ogun.deleteMany({
        where: {
          dietId: id,
        },
      });

      // Finally delete the diet
      await prisma.diet.delete({
        where: { id },
      });

      return true;
    } catch (error) {
      console.error("Error deleting diet:", error);
      throw error;
    }
  },
};

export default DietService;
