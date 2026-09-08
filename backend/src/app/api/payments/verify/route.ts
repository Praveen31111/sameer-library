import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

        if (!bookingId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (process.env.NODE_ENV !== "production" && razorpaySignature === "expo-go-mock-signature") {
            console.log("Verify payment: Bypassing signature check for development");
        } else {
            const secret = process.env.RAZORPAY_KEY_SECRET;
            if (!secret) return NextResponse.json({ error: "Server config error" }, { status: 500 });

            // Verify signature
            const generatedSignature = crypto
                .createHmac("sha256", secret)
                .update(razorpayOrderId + "|" + razorpayPaymentId)
                .digest("hex");

            if (generatedSignature !== razorpaySignature) {
                return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
            }
        }

        // Find the pending payment for this booking / order
        const pendingPayment = await prisma.payment.findFirst({
            where: {
                bookingId: bookingId,
                providerOrderId: razorpayOrderId,
            }
        }) || await prisma.payment.findFirst({
            where: {
                bookingId: bookingId,
                status: "PENDING"
            }
        });

        const receiptNo = `SL-REC-${Date.now().toString().slice(-8)}`;

        if (pendingPayment) {
            await prisma.payment.update({
                where: { id: pendingPayment.id },
                data: {
                    status: "SUCCESS",
                    providerPaymentId: razorpayPaymentId,
                    receiptNumber: receiptNo,
                    paymentMode: "ONLINE_GATEWAY",
                    provider: "App Payment Gateway (Razorpay)",
                }
            });
        }

        // Update booking due balances and auto-approve if pending
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (booking) {
            const paidAmt = pendingPayment?.amount || booking.amount;
            const newPaid = (booking.paidAmount || 0) + paidAmt;
            const newDue = Math.max(0, (booking.totalFee || booking.amount) - newPaid);
            await prisma.booking.update({
                where: { id: bookingId },
                data: {
                    status: "APPROVED", // Student paid online, automatically approve and lock seat!
                    paidAmount: newPaid,
                    dueAmount: newDue,
                    paymentStatus: newDue === 0 ? "PAID" : "PARTIAL",
                    autoRenew: true,
                    billingCycleMonth: 1,
                    nextDueDate: booking.endDate,
                }
            });
        }

        return NextResponse.json({ success: true, receiptNumber: receiptNo });

    } catch (error) {
        console.error("Verify payment error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
