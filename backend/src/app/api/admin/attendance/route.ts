
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

        const formattedAttendance = attendance.map(a => ({
            id: a.id,
            studentName: a.student.name,
            studentEmail: a.student.email,
            branch: a.branch.name,
            date: new Date(a.checkInAt).toLocaleDateString(),
            checkIn: new Date(a.checkInAt).toLocaleTimeString(),
            checkOut: a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString() : "-",
            status: a.checkOutAt ? "Completed" : "Active",
            duration: a.checkOutAt
                ? `${Math.round((new Date(a.checkOutAt).getTime() - new Date(a.checkInAt).getTime()) / (1000 * 60))} mins`
                : "-"
        }));

        return NextResponse.json({ attendance: formattedAttendance });
    } catch (error) {
        console.error("Get all attendance error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
