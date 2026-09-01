
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

        const students = await prisma.user.findMany({
            where: { role: "STUDENT" },
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { bookings: true }
                }
            }
        });

        const formattedStudents = students.map(s => ({
            id: s.id,
            name: s.name,
            email: s.email,
            phone: s.phone,
            photo: s.profilePhoto, // Assuming URL or null
            college: s.college,
            course: s.course,
            joinedDate: s.createdAt,
            status: s.status,
            activePlan: "None", // Placeholder, would need more complex query to find active plan
            lastActive: s.updatedAt, // Placeholder for last activity
            totalBookings: s._count.bookings
        }));

        return NextResponse.json({ students: formattedStudents });
    } catch (error) {
        console.error("Get students error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE: Delete student and all associated records (bookings, payments, attendances, fingerprints)
export async function DELETE(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Student ID is required" }, { status: 400 });
        }

        // Verify that the student exists and is a STUDENT
        const student = await prisma.user.findFirst({
            where: {
                id,
                role: "STUDENT"
            }
        });

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        // Delete all related records in a transaction to avoid foreign key constraint errors
        await prisma.$transaction([
            prisma.payment.deleteMany({ where: { studentId: id } }),
            prisma.attendance.deleteMany({ where: { studentId: id } }),
            prisma.fingerprintTemplate.deleteMany({ where: { studentId: id } }),
            prisma.booking.deleteMany({ where: { studentId: id } }),
            prisma.user.delete({ where: { id } }),
        ]);

        return NextResponse.json({
            success: true,
            message: "Student and all associated records deleted successfully"
        });
    } catch (error) {
        console.error("Delete student error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

