import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Cleanup script to delete expired meal photos
 * This script should be run as a cron job every hour
 */
async function cleanupExpiredMealPhotos() {
  try {
    console.log("🧹 Starting cleanup of expired meal photos...");

    const now = new Date();

    // Find expired photos
    const expiredPhotos = await prisma.mealPhoto.findMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
      select: {
        id: true,
        uploadedAt: true,
        expiresAt: true,
        client: {
          select: {
            name: true,
            surname: true,
          },
        },
      },
    });

    if (expiredPhotos.length === 0) {
      console.log("✅ No expired photos found");
      return;
    }

    console.log(`📸 Found ${expiredPhotos.length} expired photos to delete`);

    // Delete expired photos
    const deleteResult = await prisma.mealPhoto.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    console.log(`🗑️  Deleted ${deleteResult.count} expired meal photos`);

    // Log details for monitoring
    expiredPhotos.forEach((photo) => {
      console.log(
        `   - Photo ID: ${photo.id}, Client: ${photo.client.name} ${photo.client.surname}, Uploaded: ${photo.uploadedAt}, Expired: ${photo.expiresAt}`
      );
    });

    console.log("✅ Cleanup completed successfully");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Get statistics about meal photos
 */
async function getMealPhotoStats() {
  try {
    const now = new Date();

    const stats = await prisma.mealPhoto.aggregate({
      _count: {
        id: true,
      },
      _min: {
        uploadedAt: true,
      },
      _max: {
        uploadedAt: true,
      },
    });

    const expiredCount = await prisma.mealPhoto.count({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    const activeCount = await prisma.mealPhoto.count({
      where: {
        expiresAt: {
          gte: now,
        },
      },
    });

    console.log("📊 Meal Photo Statistics:");
    console.log(`   Total photos: ${stats._count.id}`);
    console.log(`   Active photos: ${activeCount}`);
    console.log(`   Expired photos: ${expiredCount}`);
    console.log(`   Oldest photo: ${stats._min.uploadedAt}`);
    console.log(`   Newest photo: ${stats._max.uploadedAt}`);

    return {
      total: stats._count.id,
      active: activeCount,
      expired: expiredCount,
      oldest: stats._min.uploadedAt,
      newest: stats._max.uploadedAt,
    };
  } catch (error) {
    console.error("❌ Error getting stats:", error);
    throw error;
  }
}

// Main execution
async function main() {
  const command = process.argv[2];

  switch (command) {
    case "cleanup":
      await cleanupExpiredMealPhotos();
      break;
    case "stats":
      await getMealPhotoStats();
      break;
    default:
      console.log("Usage:");
      console.log("  npm run cleanup-photos cleanup  - Delete expired photos");
      console.log("  npm run cleanup-photos stats    - Show statistics");
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
}

export { cleanupExpiredMealPhotos, getMealPhotoStats };
