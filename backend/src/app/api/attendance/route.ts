
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
            include: {
                branch: { select: { name: true, code: true } }
            },
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

        const formattedAttendance = attendance.map(a => {
            const checkInDate = new Date(a.checkInAt);
            const checkOutDate = a.checkOutAt ? new Date(a.checkOutAt) : null;
            let durationStr = "In Progress";
            if (checkOutDate) {
                const diffMins = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60));
                const h = Math.floor(diffMins / 60);
                const m = diffMins % 60;
                durationStr = `${h}h ${m}m`;
            }

            return {
                id: a.id,
                date: checkInDate.getDate(),
                fullDate: a.checkInAt,
                dateString: checkInDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
                timeIn: checkInDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
                timeOut: checkOutDate ? checkOutDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : null,
                status: checkOutDate ? "COMPLETED" : "PUNCHED_IN",
                duration: durationStr,
                branchName: a.branch?.name || "Sameer Library",
                checkIn: a.checkInAt,
                checkOut: a.checkOutAt,
                isVerifiedLocation: a.isVerifiedLocation,
            };
        });

        // Find today's active or completed attendance record
        const now = new Date();
        const todayRecord = formattedAttendance.find(a => {
            const d = new Date(a.checkIn);
            return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        return NextResponse.json({
            attendance: formattedAttendance,
            todayAttendance: todayRecord || null,
            stats: {
                daysPresent,
                totalHours: Math.round(totalHours),
                avgHoursPerDay: daysPresent > 0 ? (totalHours / daysPresent).toFixed(1) : "0",
                streak: Math.min(daysPresent, 5),
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
