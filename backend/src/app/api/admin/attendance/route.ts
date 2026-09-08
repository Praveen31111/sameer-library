
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const date = url.searchParams.get("date"); // Optional date filter (YYYY-MM-DD)

        const where: any = {};
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            where.checkInAt = {
                gte: startDate,
                lt: endDate
            };
        }

        const attendance = await prisma.attendance.findMany({
            where,
            orderBy: { checkInAt: "desc" },
            take: 100,
            include: {
                student: { select: { name: true, email: true } },
                branch: { select: { name: true } }
            }
        });

        const formattedAttendance = attendance.map(a => {
            const inDate = new Date(a.checkInAt);
            const outDate = a.checkOutAt ? new Date(a.checkOutAt) : null;
            let durationStr = "In Progress";
            if (outDate) {
                const diffMins = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60));
                const h = Math.floor(diffMins / 60);
                const m = diffMins % 60;
                durationStr = `${h}h ${m}m`;
            }

            return {
                id: a.id,
                studentName: a.student.name,
                studentEmail: a.student.email,
                branch: a.branch.name,
                date: inDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
                checkIn: inDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
                checkOut: outDate ? outDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "-",
                status: a.checkOutAt ? "Completed" : "Active",
                duration: durationStr,
                source: a.source || "QR_CODE",
                isVerifiedLocation: a.isVerifiedLocation,
                selfiePhoto: a.selfiePhoto || null,
            };
        });

        return NextResponse.json({ attendance: formattedAttendance });
    } catch (error) {
        console.error("Get all attendance error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
