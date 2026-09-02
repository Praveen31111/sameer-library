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

// POST: Approve or reject a booking
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { bookingId, action, paymentMode } = await request.json();

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

        const updated = await prisma.booking.update({
            where: { id: bookingId },
            data: {
                status: action === "approve" ? "APPROVED" : "REJECTED",
                approvedById: user.id,
            },
        });

        // If approved, record the payment with chosen mode (Online vs Offline Cash)
        if (action === "approve") {
            const isOnline = paymentMode === "ONLINE";
            const methodLabel = isOnline ? "Online (UPI / Netbanking)" : "Offline (Cash / Counter)";
            const providerKey = isOnline ? "ONLINE_UPI" : "OFFLINE_CASH";

            await prisma.payment.upsert({
                where: { bookingId: booking.id },
                create: {
                    bookingId: booking.id,
                    studentId: booking.studentId,
                    amount: booking.amount,
                    status: "SUCCESS",
                    provider: methodLabel,
                    providerPaymentId: `${providerKey}_${Date.now()}`,
                },
                update: {
                    status: "SUCCESS",
                    provider: methodLabel,
                    amount: booking.amount,
                },
            });
        }

        return NextResponse.json({
            success: true,
            booking: {
                id: updated.id,
                status: updated.status.toLowerCase(),
                paymentMode: paymentMode || "OFFLINE",
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
