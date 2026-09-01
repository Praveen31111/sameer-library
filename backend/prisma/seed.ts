import prisma from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
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

    // Create Admin - PERMANENT CREDENTIALS (Do not change without user permission)
    const admin = await prisma.user.upsert({
        where: { email: "sameer7518@gmail.com" },
        update: {},
        create: {
            name: "Sameer Admin",
            email: "sameer7518@gmail.com",
            phone: "+919876543211",
            passwordHash: await bcrypt.hash("sameer7518", 10),
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

    // Create Sample Students
    const students = [
        { name: "Rahul Sharma", email: "rahul@example.com", phone: "+919876543212", college: "ABC University", course: "Computer Science" },
        { name: "Priya Singh", email: "priya@example.com", phone: "+919876543213", college: "XYZ College", course: "Electronics" },
        { name: "Amit Kumar", email: "amit@example.com", phone: "+919876543214", college: "DEF Institute", course: "Mechanical" },
        { name: "Neha Singh", email: "neha@example.com", phone: "+919876543215", college: "ABC University", course: "Civil" },
    ];

    for (const student of students) {
        await prisma.user.upsert({
            where: { email: student.email },
            update: {},
            create: {
                name: student.name,
                email: student.email,
                phone: student.phone,
                passwordHash: await bcrypt.hash("student123", 10),
                role: "STUDENT",
                status: "ACTIVE",
                emailVerified: true,
                phoneVerified: true,
                college: student.college,
                course: student.course,
            },
        });
    }
    console.log("✅ Created 4 sample students");

    // Create Sample Bookings
    const rahul = await prisma.user.findUnique({ where: { email: "rahul@example.com" } });
    const priya = await prisma.user.findUnique({ where: { email: "priya@example.com" } });
    const seatA3 = await prisma.seat.findFirst({ where: { seatNumber: "A3", roomId: silentZone.id } });
    const seatB5 = await prisma.seat.findFirst({ where: { seatNumber: "B5", roomId: generalReading.id } });

    if (rahul && seatA3) {
        await prisma.booking.upsert({
            where: { id: "booking-rahul-1" },
            update: {},
            create: {
                id: "booking-rahul-1",
                studentId: rahul.id,
                branchId: branch.id,
                roomId: silentZone.id,
                seatId: seatA3.id,
                startDate: new Date("2024-12-01"),
                endDate: new Date("2024-12-31"),
                planType: "MONTHLY",
                status: "APPROVED",
                amount: 1000,
                approvedById: admin.id,
            },
        });
        console.log("✅ Created booking for Rahul");
    }

    if (priya && seatB5) {
        await prisma.booking.upsert({
            where: { id: "booking-priya-1" },
            update: {},
            create: {
                id: "booking-priya-1",
                studentId: priya.id,
                branchId: branch.id,
                roomId: generalReading.id,
                seatId: seatB5.id,
                startDate: new Date("2024-12-10"),
                endDate: new Date("2024-12-31"),
                planType: "MONTHLY",
                status: "PENDING",
                amount: 1000,
            },
        });
        console.log("✅ Created pending booking for Priya");
    }

    console.log("🎉 Seed completed successfully!");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
