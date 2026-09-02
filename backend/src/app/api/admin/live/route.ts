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

        const now = new Date();

        // Fetch rooms with seats, active bookings, and branch info
        const rooms = await prisma.room.findMany({
            where: { isActive: true },
            include: {
                branch: {
                    select: { id: true, name: true, code: true }
                },
                seats: {
                    include: {
                        bookings: {
                            where: {
                                status: "APPROVED",
                                startDate: { lte: now },
                                endDate: { gte: now }
                            },
                            include: {
                                student: { select: { name: true, email: true, phone: true } }
                            }
                        }
                    }
                }
            }
        });

        // Compute flat seat map
        const seatMap = rooms.flatMap(room =>
            room.seats.map(seat => {
                const activeBooking = seat.bookings[0];
                return {
                    id: seat.id,
                    seatNumber: seat.seatNumber,
                    roomId: room.id,
                    roomName: room.name,
                    branchId: room.branch.id,
                    branchName: room.branch.name,
                    status: activeBooking ? "occupied" : (seat.status === "AVAILABLE" ? "available" : "blocked"),
                    occupant: activeBooking ? {
                        name: activeBooking.student.name,
                        email: activeBooking.student.email,
                        phone: activeBooking.student.phone,
                        checkInTime: "Active Session"
                    } : null
                };
            })
        );

        // Room-wise statistics
        const roomStats = rooms.map(room => {
            const roomSeats = seatMap.filter(s => s.roomId === room.id);
            const total = roomSeats.length;
            const occupied = roomSeats.filter(s => s.status === "occupied").length;
            const available = roomSeats.filter(s => s.status === "available").length;
            const blocked = roomSeats.filter(s => s.status === "blocked").length;
            const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

            return {
                id: room.id,
                name: room.name,
                branchId: room.branch.id,
                branchName: room.branch.name,
                total,
                occupied,
                available,
                blocked,
                occupancyRate,
            };
        });

        // Library (Branch)-wise statistics
        const branchMap = new Map<string, any>();
        rooms.forEach(room => {
            const b = room.branch;
            if (!branchMap.has(b.id)) {
                branchMap.set(b.id, {
                    id: b.id,
                    name: b.name,
                    code: b.code,
                    total: 0,
                    occupied: 0,
                    available: 0,
                    blocked: 0,
                });
            }
            const bStats = branchMap.get(b.id);
            const rSeats = seatMap.filter(s => s.roomId === room.id);
            bStats.total += rSeats.length;
            bStats.occupied += rSeats.filter(s => s.status === "occupied").length;
            bStats.available += rSeats.filter(s => s.status === "available").length;
            bStats.blocked += rSeats.filter(s => s.status === "blocked").length;
        });

        const libraryStats = Array.from(branchMap.values()).map(b => ({
            ...b,
            occupancyRate: b.total > 0 ? Math.round((b.occupied / b.total) * 100) : 0,
        }));

        return NextResponse.json({
            seats: seatMap,
            roomStats,
            libraryStats,
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
