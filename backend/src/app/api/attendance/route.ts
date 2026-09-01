
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const attendance = await prisma.attendance.findMany({
            where: { studentId: user.id },
            orderBy: { checkInAt: "desc" },
            take: 100 // Limit to last 100 records
        });

        // Calculate stats
        const daysPresent = new Set(attendance.map(a => new Date(a.checkInAt).toDateString())).size;

        let totalHours = 0;
        attendance.forEach(a => {
            if (a.checkOutAt) {
                const diff = new Date(a.checkOutAt).getTime() - new Date(a.checkInAt).getTime();
                totalHours += diff / (1000 * 60 * 60);
            }
        });

        const formattedAttendance = attendance.map(a => ({
            date: new Date(a.checkInAt).getDate(),
            fullDate: a.checkInAt,
            status: "present",
            checkIn: a.checkInAt,
            checkOut: a.checkOutAt
        }));

        return NextResponse.json({
            attendance: formattedAttendance,
            stats: {
                daysPresent,
                totalHours: Math.round(totalHours),
                avgHoursPerDay: daysPresent > 0 ? (totalHours / daysPresent).toFixed(1) : 0,
                streak: 0 // TODO: Calculate streak logic
            }
        });
    } catch (error) {
        console.error("Get attendance error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
