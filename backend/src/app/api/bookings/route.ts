import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const bookingSchema = z.object({
    branchId: z.string(),
    roomId: z.string(),
    seatId: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    planType: z.enum(["HOURLY", "HALF_DAY", "DAILY", "WEEKLY", "MONTHLY"]),
    amount: z.number().positive(),
});

// GET: List bookings for current user
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const status = url.searchParams.get("status");

        const where: Record<string, unknown> = { studentId: user.id };
        if (status && status !== "all") {
            where.status = status.toUpperCase();
        }

        const bookings = await prisma.booking.findMany({
            where,
            include: {
                branch: { select: { name: true } },
                room: { select: { name: true } },
                seat: { select: { seatNumber: true } },
                payment: { select: { status: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({
            bookings: bookings.map((b) => ({
                id: b.id,
                seat: b.seat.seatNumber,
                room: b.room.name,
                branch: b.branch.name,
                startDate: b.startDate,
                endDate: b.endDate,
                planType: b.planType,
                amount: b.amount,
                status: b.status.toLowerCase(),
                paymentStatus: b.payment?.status.toLowerCase() ?? null,
            })),
        });
    } catch (error) {
        console.error("Get bookings error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST: Create new booking
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const data = bookingSchema.parse(body);

        // Check if seat is available
        const existingBooking = await prisma.booking.findFirst({
            where: {
                seatId: data.seatId,
                status: { in: ["PENDING", "APPROVED"] },
                OR: [
                    {
                        startDate: { lte: new Date(data.endDate) },
                        endDate: { gte: new Date(data.startDate) },
                    },
                ],
            },
        });

        if (existingBooking) {
            return NextResponse.json(
                { error: "This seat is already booked for the selected dates" },
                { status: 400 }
            );
        }

        // Create booking
        const booking = await prisma.booking.create({
            data: {
                studentId: user.id,
                branchId: data.branchId,
                roomId: data.roomId,
                seatId: data.seatId,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                planType: data.planType,
                amount: data.amount,
                status: "PENDING",
            },
            include: {
                seat: { select: { seatNumber: true } },
                room: { select: { name: true } },
                branch: { select: { name: true } },
            },
        });

        return NextResponse.json(
            {
                success: true,
                booking: {
                    id: booking.id,
                    seat: booking.seat.seatNumber,
                    room: booking.room.name,
                    branch: booking.branch.name,
                    status: booking.status,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation failed", issues: error.issues },
                { status: 400 }
            );
        }
        console.error("Create booking error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
