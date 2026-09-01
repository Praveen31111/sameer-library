
const { createClient } = require("@libsql/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");
const { PrismaClient } = require("@prisma/client");
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const url = `file:${dbPath}`;
console.log("Setting Env URL:", url);
process.env.DATABASE_URL = url;

async function run() {
    try {
        const libsql = createClient({
            url: `file:///${dbPath.replace(/\\/g, '/')}`,
        });
        console.log("LibSQL Client Created");

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
