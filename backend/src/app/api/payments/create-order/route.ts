
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
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
        const { bookingId } = body;

        if (!bookingId) {
            return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
        }

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: { payment: true }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        if (booking.studentId !== user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (booking.payment && booking.payment.status === "SUCCESS") {
            return NextResponse.json({ error: "Booking already paid" }, { status: 400 });
        }

        // Initialize Razorpay
        let orderId = `order_mock_${Math.floor(Math.random() * 1000000)}`;
        let keyId = "rzp_test_mockkeyid";

        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            if (process.env.NODE_ENV === "production") {
                console.error("Razorpay keys missing in production");
                return NextResponse.json({ error: "Payment gateway configuration missing" }, { status: 500 });
            }
            console.log("Razorpay keys missing in development - using mock order ID");
        } else {
            const razorpay = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });

            const options = {
                amount: Math.round(booking.amount * 100), // amount in smallest currency unit
                currency: "INR",
                receipt: `rcpt_${bookingId.substring(0, 10)}`,
            };

            const order = await razorpay.orders.create(options);
            orderId = order.id;
            keyId = process.env.RAZORPAY_KEY_ID;
        }

        // Create or Update pending payment record? 
        // We usually wait for success to create Payment, OR create a pending one now.
        // Let's create a pending payment record or update if exists

        // Check if pending payment exists
        const existingPayment = await prisma.payment.findUnique({
            where: { bookingId: bookingId }
        });

        if (existingPayment) {
            await prisma.payment.update({
                where: { bookingId: bookingId },
                data: {
                    providerOrderId: orderId,
                    amount: booking.amount,
                    status: "PENDING"
                }
            });
        } else {
            await prisma.payment.create({
                data: {
                    amount: booking.amount,
                    status: "PENDING",
                    provider: "razorpay",
                    providerOrderId: orderId,
                    bookingId: bookingId,
                    studentId: user.id
                }
            });
        }

        return NextResponse.json({
            id: orderId,
            currency: "INR",
            amount: booking.amount * 100,
            keyId: keyId
        });

    } catch (error) {
        console.error("Create order error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
