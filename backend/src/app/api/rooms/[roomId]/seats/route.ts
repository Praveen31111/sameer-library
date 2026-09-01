import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export async function GET(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const { roomId } = await params;

        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: {
                seats: {
                    orderBy: { seatNumber: "asc" }, // Should rely on numeric sort if possible, string sort "A1", "A10" is tricky
                },
                branch: {
                    select: { name: true },
                },
            },
        });

        if (!room) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        // Get active bookings to determine which seats are booked
        const activeBookings = await prisma.booking.findMany({
            where: {
                roomId,
                status: { in: ["APPROVED", "PENDING"] },
                endDate: { gte: new Date() },
            },
            select: { seatId: true },
        });

        const bookedSeatIds = new Set(activeBookings.map((b) => b.seatId));

        const seats = room.seats.sort((a, b) => {
            // Smart sort for A1, A2, A10
            const numA = parseInt(a.seatNumber.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.seatNumber.replace(/\D/g, '')) || 0;
            return numA - numB;
        }).map((seat) => ({
            id: seat.id,
            seatNumber: seat.seatNumber,
            status:
                seat.status !== "AVAILABLE"
                    ? seat.status.toLowerCase()
                    : bookedSeatIds.has(seat.id)
                        ? "booked"
                        : "available",
            rawStatus: seat.status // expose raw status for admin
        }));

        return NextResponse.json({
            room: {
                id: room.id,
                name: room.name,
                capacity: room.capacity,
                branchName: room.branch.name,
            },
            seats,
        });
    } catch (error) {
        console.error("Get seats error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { roomId } = await params;
        const body = await request.json();

        // Simple "Add Seat" logic: finds highest number and adds +1
        // Or "Add Bulk"
        const count = body.count || 1;

        const room = await prisma.room.findUnique({
            where: { id: roomId },
            include: { seats: true }
        });

        if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

        const currentSeats = room.seats;
        let startNum = 1;
        if (currentSeats.length > 0) {
            const nums = currentSeats.map(s => parseInt(s.seatNumber.replace(/\D/g, '')) || 0);
            startNum = Math.max(...nums) + 1;
        }

        const prefix = room.name.charAt(0).toUpperCase(); // e.g., 'S' for Silent
        const newSeatsData = [];

        for (let i = 0; i < count; i++) {
            newSeatsData.push({
                roomId,
                seatNumber: `${prefix}${startNum + i}`,
                status: "AVAILABLE" as const // Type cast for Prisma enum
            });
        }

        await prisma.seat.createMany({
            data: newSeatsData
        });

        // Update room capacity
        await prisma.room.update({
            where: { id: roomId },
            data: { capacity: { increment: count } }
        });

        return NextResponse.json({ success: true, added: count });

    } catch (error) {
        console.error("Add seat error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ roomId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { seatId, action } = body; // action: "BLOCK", "UNBLOCK", "DELETE"

        if (action === "DELETE") {
            await prisma.seat.delete({ where: { id: seatId } });
            await prisma.room.update({
                where: { id: await (await params).roomId },
                data: { capacity: { decrement: 1 } }
            });
        } else if (action === "BLOCK") {
            await prisma.seat.update({
                where: { id: seatId },
                data: { status: "BLOCKED" }
            });
        } else if (action === "UNBLOCK") {
            await prisma.seat.update({
                where: { id: seatId },
                data: { status: "AVAILABLE" }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Update seat error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
