
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch rooms with seats and active bookings
        // We define active booking as currently approved and time overlaps
        const now = new Date();

        const rooms = await prisma.room.findMany({
            where: { isActive: true },
            include: {
                seats: {
                    include: {
                        bookings: {
                            where: {
                                status: "APPROVED",
                                startDate: { lte: now },
                                endDate: { gte: now }
                            },
                            include: {
                                student: { select: { name: true, email: true } }
                            }
                        }
                    }
                }
            }
        });

        // Transform to flat seat map
        const seatMap = rooms.flatMap(room =>
            room.seats.map(seat => {
                const activeBooking = seat.bookings[0]; // Should be only one if validation works
                return {
                    id: seat.id,
                    seatNumber: seat.seatNumber,
                    roomName: room.name,
                    status: activeBooking ? "occupied" : (seat.status === "AVAILABLE" ? "available" : "blocked"),
                    occupant: activeBooking ? {
                        name: activeBooking.student.name,
                        email: activeBooking.student.email,
                        checkInTime: "10:00 AM" // Mock for now, would join with Attendance if strict
                    } : null
                };
            })
        );

        return NextResponse.json({
            seats: seatMap,
            stats: {
                total: seatMap.length,
                occupied: seatMap.filter(s => s.status === "occupied").length,
                available: seatMap.filter(s => s.status === "available").length,
                blocked: seatMap.filter(s => s.status === "blocked").length
            }
        });
    } catch (error) {
        console.error("Get live view error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
