import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        console.log("🌱 Starting seed...");

        // Create Owner
        const owner = await prisma.user.upsert({
            where: { email: "owner@sameerlibrary.com" },
            update: {},
            create: {
                name: "Sameer Khan",
                email: "owner@sameerlibrary.com",
                phone: "+919876543210",
                passwordHash: await bcrypt.hash("owner123", 10),
                role: "OWNER",
                status: "ACTIVE",
                emailVerified: true,
                phoneVerified: true,
            },
        });
        console.log("✅ Created owner:", owner.name);

        // Create Branch
        const branch = await prisma.branch.upsert({
            where: { code: "SL01" },
            update: {},
            create: {
                name: "Sameer Library - Aliganj",
                code: "SL01",
                address: "Maharajganj Sonauli Road, Mohanapur Bypass, Near Bokwa",
                city: "Maharajganj",
                ownerId: owner.id,
                isActive: true,
            },
        });
        console.log("✅ Created branch:", branch.name);

        // Create Admin
        const admin = await prisma.user.upsert({
            where: { email: "admin@sameerlibrary.com" },
            update: {},
            create: {
                name: "Admin User",
                email: "admin@sameerlibrary.com",
                phone: "+919876543211",
                passwordHash: await bcrypt.hash("admin123", 10),
                role: "ADMIN",
                status: "ACTIVE",
                emailVerified: true,
                phoneVerified: true,
            },
        });
        console.log("✅ Created admin:", admin.name);

        // Create Rooms
        const silentZone = await prisma.room.upsert({
            where: { id: "room-silent-zone" },
            update: {},
            create: {
                id: "room-silent-zone",
                name: "Silent Zone",
                capacity: 30,
                branchId: branch.id,
                isActive: true,
            },
        });

        const generalReading = await prisma.room.upsert({
            where: { id: "room-general-reading" },
            update: {},
            create: {
                id: "room-general-reading",
                name: "General Reading",
                capacity: 20,
                branchId: branch.id,
                isActive: true,
            },
        });
        console.log("✅ Created rooms: Silent Zone, General Reading");

        // Create Seats for Silent Zone (A1-A30)
        for (let i = 1; i <= 30; i++) {
            await prisma.seat.upsert({
                where: { roomId_seatNumber: { roomId: silentZone.id, seatNumber: `A${i}` } },
                update: {},
                create: {
                    seatNumber: `A${i}`,
                    roomId: silentZone.id,
                    status: "AVAILABLE",
                },
            });
        }
        console.log("✅ Created 30 seats in Silent Zone");

        // Create Seats for General Reading (B1-B20)
        for (let i = 1; i <= 20; i++) {
            await prisma.seat.upsert({
                where: { roomId_seatNumber: { roomId: generalReading.id, seatNumber: `B${i}` } },
                update: {},
                create: {
                    seatNumber: `B${i}`,
                    roomId: generalReading.id,
                    status: "AVAILABLE",
                },
            });
        }
        console.log("✅ Created 20 seats in General Reading");

        console.log("🎉 Seed completed successfully!");

        return NextResponse.json({
            success: true,
            message: "Database seeded successfully!",
            data: {
                branch: branch.name,
                rooms: ["Silent Zone", "General Reading"],
                seats: 50
            }
        });
    } catch (error) {
        console.error("❌ Seed failed:", error);
        return NextResponse.json(
            { error: "Seed failed", details: String(error) },
            { status: 500 }
        );
    }
}
