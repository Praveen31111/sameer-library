
const { PrismaClient } = require("@prisma/client");
const path = require('path');

// Test 1: Set env var to absolute path
const dbPath = path.join(__dirname, 'prisma', 'dev.db');
process.env.DATABASE_URL = `file:${dbPath}`;

console.log("Forced DATABASE_URL:", process.env.DATABASE_URL);

async function run() {
    try {
        const prisma = new PrismaClient({});
        console.log("Prisma Client Created (Standard)");

        const u = await prisma.user.findFirst();
        console.log("Success: Found user maybe?", u);

        await prisma.$disconnect();
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
