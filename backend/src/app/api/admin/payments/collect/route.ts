import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// POST: Admin records a partial or full payment entry (Cash/Counter) for a student's seat
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { bookingId, amount, paymentMode = "OFFLINE_CASH", referenceId, remarks } = body;

        const payAmount = Number(amount);
        if (!bookingId || isNaN(payAmount) || payAmount <= 0) {
            return NextResponse.json({ error: "Valid bookingId and positive amount are required" }, { status: 400 });
        }

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                student: { select: { id: true, name: true, phone: true, email: true } },
                seat: { select: { seatNumber: true } },
                branch: { select: { name: true } },
            }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Calculate new paid and due balances
        const currentPaid = booking.paidAmount || 0;
        const currentTotal = booking.totalFee || booking.amount || 0;
        const newPaid = currentPaid + payAmount;
        const newDue = Math.max(0, currentTotal - newPaid);
        const newPaymentStatus = newDue === 0 ? "PAID" : "PARTIAL";

        // Generate clean receipt number
        const receiptNumber = `SL-REC-${Date.now().toString().slice(-8)}`;

        let methodLabel = "Cash (Library Counter)";
        let providerKey = "OFFLINE_CASH";

        if (paymentMode === "ADMIN_GPAY" || paymentMode === "COUNTER_UPI") {
            methodLabel = "Admin GPay / Direct UPI";
            providerKey = "ADMIN_GPAY";
        } else if (paymentMode === "BANK_TRANSFER") {
            methodLabel = "Bank Account Transfer";
            providerKey = "BANK_TRANSFER";
        }

        const providerPaymentId = referenceId && referenceId.trim().length > 0 ? referenceId.trim() : `${providerKey}_${Date.now()}`;

        // Transactional update: create payment log and update booking balance
        const [paymentRecord, updatedBooking] = await prisma.$transaction([
            prisma.payment.create({
                data: {
                    bookingId: booking.id,
                    studentId: booking.studentId,
                    amount: payAmount,
                    status: "SUCCESS",
                    paymentMode: paymentMode, // OFFLINE_CASH, ADMIN_GPAY, BANK_TRANSFER
                    provider: methodLabel,
                    providerPaymentId: providerPaymentId,
                    receiptNumber: receiptNumber,
                    remarks: remarks || `Fee installment of ₹${payAmount} collected by Admin (${methodLabel})`,
                    collectedById: user.id,
                }
            }),
            prisma.booking.update({
                where: { id: bookingId },
                data: {
                    paidAmount: newPaid,
                    dueAmount: newDue,
                    paymentStatus: newPaymentStatus,
                }
            })
        ]);

        return NextResponse.json({
            success: true,
            message: `Payment of ₹${payAmount} successfully recorded`,
            receipt: {
                receiptNumber: paymentRecord.receiptNumber,
                amountPaid: paymentRecord.amount,
                date: paymentRecord.createdAt,
                paymentMode: paymentRecord.paymentMode,
                remarks: paymentRecord.remarks,
                student: {
                    name: booking.student.name,
                    phone: booking.student.phone,
                    seat: booking.seat.seatNumber,
                    branch: booking.branch.name,
                },
                balances: {
                    totalFee: updatedBooking.totalFee,
                    paidAmount: updatedBooking.paidAmount,
                    remainingDue: updatedBooking.dueAmount,
                    paymentStatus: updatedBooking.paymentStatus,
                }
            }
        });
    } catch (error) {
        console.error("Admin collect payment error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
