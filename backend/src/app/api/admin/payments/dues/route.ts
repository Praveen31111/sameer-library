import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// GET: Returns summary statistics and list of students with fees due / overdue
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const filter = url.searchParams.get("filter") || "ALL"; // ALL, DUE, OVERDUE, PAID

        const now = new Date();

        // Fetch all active or approved bookings
        const bookings = await prisma.booking.findMany({
            where: {
                status: "APPROVED",
            },
            include: {
                student: {
                    select: { id: true, name: true, email: true, phone: true, profilePhoto: true }
                },
                seat: { select: { seatNumber: true } },
                room: { select: { name: true } },
                branch: { select: { id: true, name: true } },
                payments: {
                    orderBy: { createdAt: "desc" },
                    take: 5,
                    select: {
                        id: true,
                        amount: true,
                        paymentMode: true,
                        receiptNumber: true,
                        createdAt: true,
                        remarks: true
                    }
                }
            },
            orderBy: [
                { dueAmount: "desc" },
                { endDate: "asc" }
            ]
        });

        // Compute payment mode collection breakdown
        const paymentModeBreakdown = await prisma.payment.groupBy({
            by: ["paymentMode"],
            where: {
                status: "SUCCESS",
            },
            _sum: {
                amount: true,
            },
        });

        let cashCollected = 0;
        let gpayCollected = 0;
        let gatewayCollected = 0;

        paymentModeBreakdown.forEach(group => {
            const sum = group._sum.amount || 0;
            if (group.paymentMode === "OFFLINE_CASH") {
                cashCollected += sum;
            } else if (group.paymentMode === "ADMIN_GPAY") {
                gpayCollected += sum;
            } else if (group.paymentMode === "ONLINE_GATEWAY") {
                gatewayCollected += sum;
            }
        });

        // Compute stats
        let totalRevenueCollected = 0;
        let totalDueOutstanding = 0;
        let overdueStudentsCount = 0;
        let dueStudentsCount = 0;
        let fullyPaidStudentsCount = 0;

        const studentsWithDues = bookings.map(b => {
            const due = b.dueAmount !== undefined ? b.dueAmount : Math.max(0, (b.amount || 0) - (b.paidAmount || 0));
            const paid = b.paidAmount || 0;
            const total = b.totalFee || b.amount || 0;
            
            // Check overdue condition
            const isEndDatePassed = new Date(b.endDate) < now;
            const isOverdue = due > 0 && isEndDatePassed;
            
            const daysRemainingOrOverdue = Math.round((new Date(b.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            totalRevenueCollected += paid;
            totalDueOutstanding += due;

            if (due === 0) {
                fullyPaidStudentsCount++;
            } else {
                dueStudentsCount++;
                if (isOverdue) overdueStudentsCount++;
            }

            return {
                id: b.id,
                studentId: b.student.id,
                studentName: b.student.name,
                studentPhone: b.student.phone || "N/A",
                studentEmail: b.student.email,
                profilePhoto: b.student.profilePhoto,
                seatNumber: b.seat.seatNumber,
                roomName: b.room.name,
                branchName: b.branch.name,
                planType: b.planType,
                totalFee: total,
                paidAmount: paid,
                dueAmount: due,
                paymentStatus: isOverdue ? "OVERDUE" : (due === 0 ? "PAID" : (paid > 0 ? "PARTIAL" : "DUE")),
                startDate: b.startDate,
                endDate: b.endDate,
                nextDueDate: b.nextDueDate || b.endDate,
                daysRemainingOrOverdue: daysRemainingOrOverdue,
                isOverdue: isOverdue,
                lastReminderSentAt: b.lastReminderSentAt,
                reminderCount: b.reminderCount,
                recentPayments: b.payments,
            };
        });

        // Apply filter
        let filteredStudents = studentsWithDues;
        if (filter === "DUE") {
            filteredStudents = studentsWithDues.filter(s => s.dueAmount > 0 && !s.isOverdue);
        } else if (filter === "OVERDUE") {
            filteredStudents = studentsWithDues.filter(s => s.isOverdue);
        } else if (filter === "PAID") {
            filteredStudents = studentsWithDues.filter(s => s.dueAmount === 0);
        }

        const search = url.searchParams.get("search")?.toLowerCase().trim();
        if (search) {
            filteredStudents = filteredStudents.filter(s =>
                s.studentName.toLowerCase().includes(search) ||
                (s.studentPhone && s.studentPhone.includes(search)) ||
                s.studentEmail.toLowerCase().includes(search) ||
                s.seatNumber.toLowerCase().includes(search) ||
                s.branchName.toLowerCase().includes(search)
            );
        }

        return NextResponse.json({
            stats: {
                totalRevenueCollected,
                cashCollected,
                gpayCollected,
                gatewayCollected,
                totalDueOutstanding,
                overdueStudentsCount,
                dueStudentsCount,
                fullyPaidStudentsCount,
                totalActiveSeats: bookings.length,
            },
            students: filteredStudents
        });
    } catch (error) {
        console.error("Get dues error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
