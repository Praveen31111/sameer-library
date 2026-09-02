
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

        // Parallel queries for stats
        const [
            totalStudents,
            activeBookings,
            pendingApprovals,
            totalSeats,
            revenueThisMonth,
            rooms,
            recentBookings,
            recentPayments,
            recentAttendance
        ] = await Promise.all([
            // 1. Total Students
            prisma.user.count({ where: { role: "STUDENT" } }),

            // 2. Active Bookings
            prisma.booking.count({
                where: {
                    status: "APPROVED",
                    endDate: { gte: new Date() }
                }
            }),

            // 3. Pending Approvals
            prisma.booking.count({
                where: {
                    status: "PENDING"
                }
            }),

            // 4. Total Seats
            prisma.seat.count(),

            // 4. Revenue (Current Month)
            prisma.payment.aggregate({
                _sum: { amount: true },
                where: {
                    status: "SUCCESS",
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                    }
                }
            }),

            // 5. Rooms Occupancy
            prisma.room.findMany({
                include: {
                    _count: { select: { seats: true } },
                    bookings: {
                        where: {
                            status: "APPROVED",
                            startDate: { lte: new Date() },
                            endDate: { gte: new Date() }
                        }
                    }
                }
            }),

            // 6. Recent Activity - Bookings
            prisma.booking.findMany({
                take: 5,
                orderBy: { createdAt: "desc" },
                include: { student: { select: { name: true } } }
            }),

            // 7. Recent Activity - Payments
            prisma.payment.findMany({
                take: 5,
                orderBy: { createdAt: "desc" },
                include: { student: { select: { name: true } } }
            }),

            // 8. Recent Activity - Attendance
            prisma.attendance.findMany({
                take: 5,
                orderBy: { checkInAt: "desc" },
                include: { student: { select: { name: true } } }
            })
        ]);

        // Calculate Occupancy
        const occupancyData = rooms.map(room => {
            const total = room._count.seats;
            const occupied = room.bookings.length;
            return {
                room: room.name,
                occupied,
                total,
                percentage: total > 0 ? Math.round((occupied / total) * 100) : 0
            };
        });

        const totalOccupied = occupancyData.reduce((sum, r) => sum + r.occupied, 0);
        const occupancyRate = totalSeats > 0 ? Math.round((totalOccupied / totalSeats) * 100) : 0;

        // Merge Activity Stream
        const activity = [
            ...recentBookings.map(b => ({
                time: b.createdAt,
                event: `New booking request from ${b.student.name}`,
                type: "booking"
            })),
            ...recentPayments.map(p => ({
                time: p.createdAt,
                event: `Payment received ₹${p.amount} from ${p.student.name}`,
                type: "payment"
            })),
            ...recentAttendance.map(a => ({
                time: a.checkInAt,
                event: `${a.student.name} checked in`,
                type: "checkin"
            }))
        ]
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .slice(0, 10)
            .map(a => ({
                ...a,
                time: new Date(a.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));

        return NextResponse.json({
            stats: {
                totalStudents,
                activeBookings,
                pendingApprovals,
                revenue: revenueThisMonth._sum.amount || 0,
                occupancyRate,
                totalSeats
            },
            occupancyData,
            recentActivity: activity
        });

    } catch (error) {
        console.error("Get admin stats error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
