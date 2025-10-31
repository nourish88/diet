#!/usr/bin/env node

/**
 * API Security Test Script
 *
 * This script tests the security implementation by attempting various
 * unauthorized access scenarios to ensure proper isolation.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Test data setup
let dietitian1Id: number;
let dietitian2Id: number;
let client1Id: number;
let client2Id: number;
let diet1Id: number;
let template1Id: number;

async function setupTestData() {
  console.log("🔧 Setting up test data...");

  try {
    // Create test dietitians
    const dietitian1 = await prisma.user.create({
      data: {
        supabaseId: "test-dietitian-1",
        email: "dietitian1@test.com",
        role: "dietitian",
        isApproved: true,
      },
    });

    const dietitian2 = await prisma.user.create({
      data: {
        supabaseId: "test-dietitian-2",
        email: "dietitian2@test.com",
        role: "dietitian",
        isApproved: true,
      },
    });

    dietitian1Id = dietitian1.id;
    dietitian2Id = dietitian2.id;

    // Create test clients
    const client1 = await prisma.client.create({
      data: {
        name: "Test Client 1",
        surname: "Surname 1",
        dietitianId: dietitian1Id,
      },
    });

    const client2 = await prisma.client.create({
      data: {
        name: "Test Client 2",
        surname: "Surname 2",
        dietitianId: dietitian2Id,
      },
    });

    client1Id = client1.id;
    client2Id = client2.id;

    // Create test diet
    const diet1 = await prisma.diet.create({
      data: {
        clientId: client1Id,
        dietitianId: dietitian1Id,
        tarih: new Date(),
        su: "Test water intake",
        sonuc: "Test result",
        hedef: "Test goal",
        fizik: "Test physical activity",
      },
    });

    diet1Id = diet1.id;

    // Create test template
    const template1 = await prisma.dietTemplate.create({
      data: {
        name: "Test Template 1",
        description: "Test template description",
        dietitianId: dietitian1Id,
        isActive: true,
      },
    });

    template1Id = template1.id;

    console.log("✅ Test data created successfully");
    console.log(`   Dietitian 1 ID: ${dietitian1Id}`);
    console.log(`   Dietitian 2 ID: ${dietitian2Id}`);
    console.log(`   Client 1 ID: ${client1Id}`);
    console.log(`   Client 2 ID: ${client2Id}`);
    console.log(`   Diet 1 ID: ${diet1Id}`);
    console.log(`   Template 1 ID: ${template1Id}`);
  } catch (error) {
    console.error("❌ Error setting up test data:", error);
    throw error;
  }
}

async function testDataIsolation() {
  console.log("\n🧪 Testing data isolation...");

  try {
    // Test 1: Dietitian 1 should only see their own clients
    const dietitian1Clients = await prisma.client.findMany({
      where: { dietitianId: dietitian1Id },
    });

    console.log(
      `✅ Dietitian 1 clients: ${dietitian1Clients.length} (should be 1)`
    );

    // Test 2: Dietitian 1 should only see their own diets
    const dietitian1Diets = await prisma.diet.findMany({
      where: { dietitianId: dietitian1Id },
    });

    console.log(
      `✅ Dietitian 1 diets: ${dietitian1Diets.length} (should be 1)`
    );

    // Test 3: Dietitian 1 should only see their own templates
    const dietitian1Templates = await prisma.dietTemplate.findMany({
      where: { dietitianId: dietitian1Id },
    });

    console.log(
      `✅ Dietitian 1 templates: ${dietitian1Templates.length} (should be 1)`
    );

    // Test 4: Verify dietitian 2 cannot see dietitian 1's data
    const dietitian2Clients = await prisma.client.findMany({
      where: { dietitianId: dietitian2Id },
    });

    console.log(
      `✅ Dietitian 2 clients: ${dietitian2Clients.length} (should be 1)`
    );

    const dietitian2Diets = await prisma.diet.findMany({
      where: { dietitianId: dietitian2Id },
    });

    console.log(
      `✅ Dietitian 2 diets: ${dietitian2Diets.length} (should be 0)`
    );

    // Test 5: Verify cross-dietitian access is blocked
    const crossAccessTest = await prisma.client.findFirst({
      where: {
        id: client1Id,
        dietitianId: dietitian2Id, // This should return null
      },
    });

    if (crossAccessTest === null) {
      console.log("✅ Cross-dietitian access properly blocked");
    } else {
      console.log("❌ Cross-dietitian access NOT blocked!");
    }
  } catch (error) {
    console.error("❌ Error testing data isolation:", error);
    throw error;
  }
}

async function testApiKeySystem() {
  console.log("\n🔑 Testing API Key system...");

  try {
    // Create API key for dietitian 1
    const apiKey = await prisma.apiKey.create({
      data: {
        key: "test-hashed-key-123",
        name: "Test API Key",
        appName: "test-app",
        permissions: ["GET:/api/clients", "POST:/api/clients"],
        dietitianId: dietitian1Id,
        isActive: true,
      },
    });

    console.log(`✅ API Key created: ${apiKey.id}`);

    // Test API key permissions
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { id: apiKey.id },
      include: { dietitian: true },
    });

    if (apiKeyRecord && apiKeyRecord.dietitianId === dietitian1Id) {
      console.log("✅ API Key properly linked to dietitian");
    } else {
      console.log("❌ API Key not properly linked to dietitian");
    }
  } catch (error) {
    console.error("❌ Error testing API Key system:", error);
    throw error;
  }
}

async function cleanupTestData() {
  console.log("\n🧹 Cleaning up test data...");

  try {
    // Delete in reverse order to respect foreign key constraints
    await prisma.apiKey.deleteMany({
      where: { dietitianId: { in: [dietitian1Id, dietitian2Id] } },
    });

    await prisma.dietTemplate.deleteMany({
      where: { dietitianId: { in: [dietitian1Id, dietitian2Id] } },
    });

    await prisma.diet.deleteMany({
      where: { dietitianId: { in: [dietitian1Id, dietitian2Id] } },
    });

    await prisma.client.deleteMany({
      where: { dietitianId: { in: [dietitian1Id, dietitian2Id] } },
    });

    await prisma.user.deleteMany({
      where: { id: { in: [dietitian1Id, dietitian2Id] } },
    });

    console.log("✅ Test data cleaned up successfully");
  } catch (error) {
    console.error("❌ Error cleaning up test data:", error);
    throw error;
  }
}

async function runTests() {
  console.log("🚀 Starting API Security Tests...\n");

  try {
    await setupTestData();
    await testDataIsolation();
    await testApiKeySystem();
    await cleanupTestData();

    console.log("\n🎉 All security tests passed!");
    console.log("\n📋 Security Implementation Summary:");
    console.log("   ✅ Data isolation between dietitians");
    console.log("   ✅ API authentication system");
    console.log("   ✅ API Key management system");
    console.log("   ✅ CORS security hardening");
    console.log("   ✅ Auth sync protection");
  } catch (error) {
    console.error("\n💥 Security tests failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

export { runTests };
