import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateWhatsAppDuePayload } from "@/lib/whatsapp";

export const dynamic = 'force-dynamic';

// POST: Generate 0-cost WhatsApp link for a student's due fee and record reminder timestamp
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { bookingId } = await request.json();
        if (!bookingId) {
            return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
        }

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                student: true,
                seat: true,
                branch: true,
            }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        const totalFee = booking.totalFee || booking.amount || 0;
        const paidAmount = booking.paidAmount || 0;
        const dueAmount = booking.dueAmount !== undefined ? booking.dueAmount : Math.max(0, totalFee - paidAmount);

        // Origin for digital receipt link
        const host = request.headers.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";
        const receiptUrl = `${protocol}://${host}/receipt/${booking.id}`;

        const payload = generateWhatsAppDuePayload({
            studentName: booking.student.name,
            phone: booking.student.phone || "",
            seatNumber: booking.seat.seatNumber,
            branchName: booking.branch.name,
            totalFee: totalFee,
            paidAmount: paidAmount,
            dueAmount: dueAmount,
            dueDate: booking.nextDueDate || booking.endDate,
            receiptUrl: receiptUrl
        });

        // Update reminder timestamp and increment counter in DB
        await prisma.booking.update({
            where: { id: bookingId },
            data: {
                lastReminderSentAt: new Date(),
                reminderCount: { increment: 1 }
            }
        });

        return NextResponse.json({
            success: true,
            whatsappUrl: payload.whatsappUrl,
            messageText: payload.messageText,
            recipient: {
                name: booking.student.name,
                phone: booking.student.phone
            }
        });
    } catch (error) {
        console.error("WhatsApp reminder generation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
