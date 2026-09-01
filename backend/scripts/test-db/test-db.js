
const { createClient } = require("@libsql/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");
const { PrismaClient } = require("@prisma/client");
const path = require('path');

// Try with file:/// format forward slashes
const dbPath = path.join(__dirname, 'prisma', 'dev.db').replace(/\\/g, '/');
const url = `file:///${dbPath}`;
console.log("Testing URL:", url);

async function run() {
    try {
        const libsql = createClient({
            url,
        });
        console.log("LibSQL Client Created");

        // Test direct execution
        try {
            await libsql.execute("SELECT 1");
            console.log("LibSQL Direct Query Success!");
        } catch (e) {
            console.error("LibSQL Direct Query Failed:", e);
            return;
        }

        const adapter = new PrismaLibSql(libsql);
        console.log("Adapter Created");

        const prisma = new PrismaClient({ adapter });
        console.log("Prisma Client Created");

        const u = await prisma.user.findFirst();
        console.log("Success: Found user maybe?", u);

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
