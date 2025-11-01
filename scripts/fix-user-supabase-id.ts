/**
 * Script to update user's supabaseId in database
 * Use this when a user registered twice with different Supabase IDs
 * 
 * Usage: npx tsx scripts/fix-user-supabase-id.ts <email> <new-supabase-id>
 */

import prisma from "../lib/prisma";

async function updateUserSupabaseId(email: string, newSupabaseId: string) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      return;
    }

    console.log(`✅ Found user:`);
    console.log(`   - Current Supabase ID: ${user.supabaseId}`);
    console.log(`   - New Supabase ID: ${newSupabaseId}`);

    // Check if the new supabaseId is already in use
    const existingUser = await prisma.user.findUnique({
      where: { supabaseId: newSupabaseId },
    });

    if (existingUser && existingUser.id !== user.id) {
      console.error(`❌ Error: New Supabase ID is already in use by another user (ID: ${existingUser.id})`);
      console.log(`   You need to delete that user first from Supabase.`);
      return;
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { supabaseId: newSupabaseId },
    });

    console.log(`✅ User updated successfully!`);
    console.log(`   - User ID: ${updatedUser.id}`);
    console.log(`   - Email: ${updatedUser.email}`);
    console.log(`   - Updated Supabase ID: ${updatedUser.supabaseId}`);
    console.log(`   - Reference Code: ${updatedUser.referenceCode || "N/A"}`);
    console.log(`\n🎉 User can now login with the new Supabase account!`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get arguments from command line
const email = process.argv[2];
const newSupabaseId = process.argv[3];

if (!email || !newSupabaseId) {
  console.error("❌ Please provide email and new Supabase ID");
  console.log("Usage: npx tsx scripts/fix-user-supabase-id.ts <email> <new-supabase-id>");
  console.log("\nExample:");
  console.log("  npx tsx scripts/fix-user-supabase-id.ts user@example.com 65f0b3e4-4921-41ee-8813-3df8066f0e2c");
  process.exit(1);
}

updateUserSupabaseId(email, newSupabaseId);


