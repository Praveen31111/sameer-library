import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// POST: Nightly automated recurring billing engine
// Checks bookings where cycle completed, retains student seat, and rolls over to next month's due
export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET || "sameer_library_secret_cron_key_2026";

        // Protect endpoint with bearer secret or allow local/admin triggers
        if (authHeader && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
        }

        const now = new Date();

        // 1. Find all active bookings whose cycle has completed and autoRenew is enabled
        const expiredBookings = await prisma.booking.findMany({
            where: {
                status: "APPROVED",
                autoRenew: true,
                endDate: { lte: now }
            },
            include: {
                student: { select: { id: true, name: true, phone: true } },
                seat: { select: { seatNumber: true } }
            }
        });

        const renewedBookings: any[] = [];

        for (const booking of expiredBookings) {
            const currentEndDate = new Date(booking.endDate);
            const nextCycleStart = currentEndDate;
            const nextCycleEnd = new Date(currentEndDate);
            nextCycleEnd.setDate(nextCycleEnd.getDate() + 30); // Add 30 days for new month cycle

            // New month's fee is based on original monthly amount
            const monthlyFee = booking.amount || 1000;
            const previousUnpaidDue = booking.dueAmount || 0;
            const newTotalDue = previousUnpaidDue + monthlyFee;
            const newTotalFee = (booking.totalFee || booking.amount) + monthlyFee;

            const updated = await prisma.booking.update({
                where: { id: booking.id },
                data: {
                    startDate: nextCycleStart,
                    endDate: nextCycleEnd,
                    totalFee: newTotalFee,
                    dueAmount: newTotalDue,
                    paymentStatus: "DUE",
                    billingCycleMonth: { increment: 1 },
                    lastBilledAt: now,
                    nextDueDate: nextCycleEnd,
                    lastReminderSentAt: null,
                    reminderCount: 0
                }
            });

            renewedBookings.push({
                bookingId: updated.id,
                studentName: booking.student.name,
                seatNumber: booking.seat.seatNumber,
                newCycleEnd: nextCycleEnd,
                dueAmount: newTotalDue,
                cycle: updated.billingCycleMonth
            });
        }

        return NextResponse.json({
            success: true,
            timestamp: now,
            processedCount: expiredBookings.length,
            renewals: renewedBookings
        });

    } catch (error) {
        console.error("Cron billing cycle error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// GET: Status check for cron health & preview pending renewals
export async function GET() {
    try {
        const now = new Date();
        const pendingRenewalCount = await prisma.booking.count({
            where: {
                status: "APPROVED",
                autoRenew: true,
                endDate: { lte: now }
            }
        });

        return NextResponse.json({
            status: "active",
            pendingRenewalsReady: pendingRenewalCount,
            serverTime: now
        });
    } catch (error) {
        return NextResponse.json({ error: "Health check failed" }, { status: 500 });
    }
}
