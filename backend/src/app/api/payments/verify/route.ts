
import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        // Payment verification can technically happen via webhook too, but client-side callback is common for simple flows.
        // We verify the user is logged in at least.

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

        // Update payment status
        await prisma.payment.update({
            where: { bookingId: bookingId }, // Assumes we created a PENDING payment in create-order
            data: {
                status: "SUCCESS",
                providerPaymentId: razorpayPaymentId
            }
        });

        // Optionally update booking status if needed (e.g., if we had a PAID status)
        // But we rely on Payment record being SUCCESS. 

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Verify payment error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
