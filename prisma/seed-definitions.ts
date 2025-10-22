import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting to seed definitions...");

  // Su Tüketimi Tanımlamaları
  const suDefinitions = [
    "Günde 2-3 litre su",
    "Günde 2-3 litre zencefilli su",
    "Günde 2-3 litre limonlu su",
    "Günde 2-3 litre yeşil çay",
    "Günde 2 litre su + 1 litre bitki çayı",
    "Günde en az 2 litre su",
    "Günde 3 litre su",
  ];

  // Fiziksel Aktivite Tanımlamaları
  const fizikDefinitions = [
    "Haftada 4-5 gün yürüyüş",
    "Haftada 3-4 gün spor salonu",
    "Her gün 30 dakika yürüyüş",
    "Haftada 2-3 gün koşu",
    "Haftada 3 gün pilates",
    "Haftada 2 gün yüzme",
    "Günde 10.000 adım",
    "Haftada 5 gün egzersiz",
  ];

  // Su tüketimi tanımlamalarını ekle
  for (const name of suDefinitions) {
    await prisma.definition.upsert({
      where: { id: -1 }, // This will never match, so it will always create
      update: {},
      create: {
        type: "su_tuketimi",
        name,
        isActive: true,
      },
    });
  }

  console.log(`✅ ${suDefinitions.length} su tüketimi tanımlaması eklendi`);

  // Fiziksel aktivite tanımlamalarını ekle
  for (const name of fizikDefinitions) {
    await prisma.definition.upsert({
      where: { id: -1 }, // This will never match, so it will always create
      update: {},
      create: {
        type: "fiziksel_aktivite",
        name,
        isActive: true,
      },
    });
  }

  console.log(
    `✅ ${fizikDefinitions.length} fiziksel aktivite tanımlaması eklendi`
  );
  console.log("✨ Seed tamamlandı!");
}

main()
  .catch((e) => {
    console.error("❌ Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
