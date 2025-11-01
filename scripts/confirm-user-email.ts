/**
 * Script to manually confirm a user's email in the database
 * This helps bypass Supabase email confirmation for testing
 * 
 * Usage: npx tsx scripts/confirm-user-email.ts <email>
 */

import prisma from "../lib/prisma";

async function confirmUserEmail(email: string) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        supabaseId: true,
        role: true,
        isApproved: true,
        referenceCode: true,
      },
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      return;
    }

    console.log(`✅ Found user:`, user);
    console.log(`📋 User details:`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Supabase ID: ${user.supabaseId}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Is Approved: ${user.isApproved}`);
    console.log(`   - Reference Code: ${user.referenceCode || "N/A"}`);

    if (user.role === "client") {
      // Check if user is linked to a client
      const client = await prisma.client.findFirst({
        where: { userId: user.id },
        select: {
          id: true,
          name: true,
          surname: true,
        },
      });

      if (client) {
        console.log(`👤 Linked to client: ${client.name} ${client.surname} (ID: ${client.id})`);
      } else {
        console.log(`⚠️  Not linked to any client yet`);
      }
    }

    console.log(`\n⚠️  Note: This script only shows user info from the database.`);
    console.log(`   To enable login, you need to:`);
    console.log(`   1. Confirm the email in Supabase Dashboard, OR`);
    console.log(`   2. Disable email confirmation in Supabase Dashboard:`);
    console.log(`      Authentication > Settings > Disable "Enable email confirmations"`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error("❌ Please provide an email address");
  console.log("Usage: npx tsx scripts/confirm-user-email.ts <email>");
  process.exit(1);
}

confirmUserEmail(email);


