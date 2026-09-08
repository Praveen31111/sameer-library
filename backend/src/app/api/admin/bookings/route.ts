import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET: List all pending bookings (admin only)
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const status = url.searchParams.get("status") || "PENDING";

        const bookings = await prisma.booking.findMany({
            where: {
                status: status.toUpperCase(),
            },
            include: {
                student: {
                    select: { name: true, email: true, phone: true },
                },
                branch: { select: { name: true } },
                room: { select: { name: true } },
                seat: { select: { seatNumber: true } },
                payments: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: {
                        paymentMode: true,
                        provider: true,
                        providerPaymentId: true,
                        amount: true,
                        receiptNumber: true,
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({
            bookings: bookings.map((b) => ({
                id: b.id,
                student: {
                    name: b.student.name,
                    email: b.student.email,
                    phone: b.student.phone,
                },
                seat: b.seat.seatNumber,
                room: b.room.name,
                branch: b.branch.name,
                startDate: b.startDate,
                endDate: b.endDate,
                planType: b.planType,
                amount: b.amount,
                totalFee: b.totalFee || b.amount,
                paidAmount: b.paidAmount || 0,
                dueAmount: b.dueAmount !== undefined ? b.dueAmount : b.amount,
                paymentStatus: b.paymentStatus || "PENDING",
                paymentMode: b.payments?.[0]?.paymentMode || (b.paymentStatus === "PAID" ? "OFFLINE_CASH" : null),
                paymentProvider: b.payments?.[0]?.provider || null,
                paymentTxnId: b.payments?.[0]?.providerPaymentId || null,
                receiptNumber: b.payments?.[0]?.receiptNumber || null,
                billingCycleMonth: b.billingCycleMonth || 1,
                nextDueDate: b.nextDueDate,
                lastReminderSentAt: b.lastReminderSentAt,
                status: b.status.toLowerCase(),
                createdAt: b.createdAt,
            })),
        });
    } catch (error) {
        console.error("Get pending bookings error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST: Approve or reject a booking (Supports: "PAID", "DUE" / "APPROVE_WITHOUT_PAYMENT", "PARTIAL")
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const {
            bookingId,
            action,
            paymentAction = "PAID",
            paymentMode = "OFFLINE_CASH", // "OFFLINE_CASH" | "ADMIN_GPAY" | "ONLINE_GATEWAY"
            referenceId,
            customAmount,
            remarks
        } = await request.json();

        if (!bookingId || !["approve", "reject"].includes(action)) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { student: true },
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        if (booking.status !== "PENDING") {
            return NextResponse.json(
                { error: "Booking is not pending" },
                { status: 400 }
            );
        }

        if (action === "reject") {
            const rejected = await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    status: "REJECTED",
                    approvedById: user.id,
                },
            });
            return NextResponse.json({ success: true, booking: { id: rejected.id, status: "rejected" } });
        }

        // Action: APPROVE
        // Determine Payment Calculation based on admin choice
        const totalFee = booking.amount || 0;
        let paidAmount = 0;
        let dueAmount = totalFee;
        let paymentStatus = "DUE";

        if (paymentAction === "PAID") {
            // Admin confirms full payment was received (Cash or Admin GPay)
            paidAmount = totalFee;
            dueAmount = 0;
            paymentStatus = "PAID";
        } else if (paymentAction === "PARTIAL" && customAmount && customAmount > 0) {
            // Admin records a partial payment upon approval
            paidAmount = Math.min(Number(customAmount), totalFee);
            dueAmount = Math.max(0, totalFee - paidAmount);
            paymentStatus = dueAmount === 0 ? "PAID" : "PARTIAL";
        } else {
            // Option: "DUE" / "APPROVE_WITHOUT_PAYMENT"
            paidAmount = 0;
            dueAmount = totalFee;
            paymentStatus = "DUE";
        }

        const updated = await prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: "APPROVED",
                totalFee: totalFee,
                paidAmount: paidAmount,
                dueAmount: dueAmount,
                paymentStatus: paymentStatus,
                autoRenew: true,
                billingCycleMonth: 1,
                lastBilledAt: new Date(),
                nextDueDate: booking.endDate,
                approvedById: user.id,
            },
        });

        // If any payment was collected (Full or Partial), record payment entry
        if (paidAmount > 0) {
            let methodLabel = "Cash (Counter)";
            let providerKey = "OFFLINE_CASH";
            let finalMode = paymentMode;

            if (paymentMode === "ADMIN_GPAY" || paymentMode === "ONLINE_UPI") {
                methodLabel = "Admin GPay / Direct UPI";
                providerKey = "ADMIN_GPAY";
                finalMode = "ADMIN_GPAY";
            } else if (paymentMode === "ONLINE_GATEWAY") {
                methodLabel = "Payment Gateway (In-App)";
                providerKey = "ONLINE_GATEWAY";
                finalMode = "ONLINE_GATEWAY";
            } else {
                methodLabel = "Cash (Counter)";
                providerKey = "OFFLINE_CASH";
                finalMode = "OFFLINE_CASH";
            }

            const receiptNo = `SL-REC-${Date.now().toString().slice(-8)}`;
            const providerTxnId = referenceId && referenceId.trim().length > 0 ? referenceId.trim() : `${providerKey}_${Date.now()}`;

            await prisma.payment.create({
                data: {
                    bookingId: booking.id,
                    studentId: booking.studentId,
                    amount: paidAmount,
                    status: "SUCCESS",
                    paymentMode: finalMode,
                    provider: methodLabel,
                    providerPaymentId: providerTxnId,
                    receiptNumber: receiptNo,
                    remarks: remarks || (finalMode === "ADMIN_GPAY" ? `Paid via Admin GPay/UPI (Ref: ${providerTxnId})` : "Fee paid upon admission approval"),
                    collectedById: user.id,
                },
            });
        }

        return NextResponse.json({
            success: true,
            booking: {
                id: updated.id,
                status: updated.status.toLowerCase(),
                paymentStatus: updated.paymentStatus,
                totalFee: updated.totalFee,
                paidAmount: updated.paidAmount,
                dueAmount: updated.dueAmount,
                approvedWithoutPayment: paymentAction === "DUE",
            },
        });
    } catch (error) {
        console.error("Update booking error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
