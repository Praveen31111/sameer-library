import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const demoEmail = "student@sameerlibrary.com";

        // 1. Find or create demo student user
        let student = await prisma.user.findUnique({
            where: { email: demoEmail },
        });

        if (!student) {
            const passwordHash = await bcrypt.hash("student123", 10);
            student = await prisma.user.create({
                data: {
                    name: "Demo Student (Praveen)",
                    email: demoEmail,
                    phone: "+919876543299",
                    passwordHash,
                    role: "STUDENT",
                    status: "ACTIVE",
                    emailVerified: true,
                    phoneVerified: true,
                    college: "Sameer Learning Center",
                },
            });
        }

        // 2. Find or create branch, room, and seat for this student
        let branch = await prisma.branch.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
        });

        if (!branch) {
            let owner = await prisma.user.findFirst({
                where: { role: { in: ["OWNER", "ADMIN"] } }
            });
            branch = await prisma.branch.create({
                data: {
                    name: "Sameer Library - Main Branch",
                    code: "SL01",
                    address: "Maharajganj Main Road",
                    city: "Maharajganj",
                    ownerId: owner?.id || student.id,
                    isActive: true,
                },
            });
        }

        let room = await prisma.room.findFirst({
            where: { branchId: branch.id, isActive: true },
        });

        if (!room) {
            room = await prisma.room.create({
                data: {
                    name: "Silent Zone",
                    capacity: 30,
                    branchId: branch.id,
                    isActive: true,
                },
            });
        }

        let seat = await prisma.seat.findFirst({
            where: { roomId: room.id },
        });

        if (!seat) {
            seat = await prisma.seat.create({
                data: {
                    seatNumber: "A-01",
                    roomId: room.id,
                    status: "AVAILABLE",
                },
            });
        }

        // 3. Ensure this student has an active APPROVED booking
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

        let activeBooking = await prisma.booking.findFirst({
            where: {
                studentId: student.id,
                status: "APPROVED",
                endDate: { gte: startOfDay },
            },
        });

        if (!activeBooking) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 5); // 5 days ago
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 25); // 25 days remaining

            activeBooking = await prisma.booking.create({
                data: {
                    studentId: student.id,
                    branchId: branch.id,
                    roomId: room.id,
                    seatId: seat.id,
                    startDate,
                    endDate,
                    planType: "MONTHLY",
                    amount: 1000,
                    totalFee: 1000,
                    paidAmount: 500,
                    dueAmount: 500,
                    paymentStatus: "DUE",
                    status: "APPROVED",
                },
            });

            // Mark seat as OCCUPIED
            await prisma.seat.update({
                where: { id: seat.id },
                data: { status: "OCCUPIED" },
            });
        }

        // 4. Generate token
        const token = generateToken({
            userId: student.id,
            email: student.email,
            role: student.role,
        });

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: student.id,
                name: student.name,
                email: student.email,
                role: student.role,
                status: student.status,
                phone: student.phone,
                college: student.college,
                profilePhoto: student.profilePhoto,
            },
            demoBooking: {
                seatNumber: seat.seatNumber,
                branchName: branch.name,
                roomName: room.name,
                dueAmount: activeBooking.dueAmount,
            }
        });
    } catch (error: any) {
        console.error("Demo student login error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Failed to initialize demo student" },
            { status: 500 }
        );
    }
}
