import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Create default dietitian user in database
  console.log("👨‍⚕️ Creating default dietitian in database...");

  const dietitianEmail = "dietitian@example.com";
  const dietitianSupabaseId = "default-dietitian-id"; // This will be updated when user logs in

  try {
    // Create or update dietitian in our database
    const dietitian = await prisma.user.upsert({
      where: { email: dietitianEmail },
      update: {
        role: "dietitian",
        isApproved: true,
        approvedAt: new Date(),
      },
      create: {
        supabaseId: dietitianSupabaseId,
        email: dietitianEmail,
        role: "dietitian",
        isApproved: true,
        approvedAt: new Date(),
      },
    });

    console.log("✅ Dietitian created/updated in database:", dietitian.id);

    // 2. Update all existing clients to belong to this dietitian
    console.log("👥 Updating existing clients...");

    const clientUpdateResult = await prisma.client.updateMany({
      where: {
        dietitianId: null,
      },
      data: {
        dietitianId: dietitian.id,
      },
    });

    console.log(`✅ Updated ${clientUpdateResult.count} clients`);

    // 3. Update all existing diets to belong to this dietitian
    console.log("🍽️ Updating existing diets...");

    const dietUpdateResult = await prisma.diet.updateMany({
      where: {
        dietitianId: null,
      },
      data: {
        dietitianId: dietitian.id,
      },
    });

    console.log(`✅ Updated ${dietUpdateResult.count} diets`);

    // 4. Summary
    console.log("\n🎉 Database seeding completed!");
    console.log("📋 Summary:");
    console.log(`   - Dietitian ID: ${dietitian.id}`);
    console.log(`   - Email: ${dietitianEmail}`);
    console.log(`   - Clients updated: ${clientUpdateResult.count}`);
    console.log(`   - Diets updated: ${dietUpdateResult.count}`);
    console.log("\n📝 Next steps:");
    console.log("   1. Go to Supabase dashboard");
    console.log("   2. Create a user with email: dietitian@example.com");
    console.log("   3. Copy the Supabase user ID");
    console.log("   4. Update the dietitian record with the real Supabase ID");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
