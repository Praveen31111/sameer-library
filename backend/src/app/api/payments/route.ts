
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payments = await prisma.payment.findMany({
            where: { studentId: user.id },
            include: {
                booking: {
                    select: {
                        roomId: true,
                        seatId: true,
                        planType: true,
                        room: { select: { name: true } },
                        seat: { select: { seatNumber: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Transform data for frontend
        const formattedPayments = payments.map(p => ({
            id: p.id,
            date: new Date(p.createdAt).toLocaleDateString(),
            amount: p.amount,
            status: p.status.toLowerCase(),
            method: p.provider === 'razorpay' ? 'Online' : 'Cash',
            booking: {
                seat: p.booking.seat.seatNumber,
                room: p.booking.room.name,
                plan: p.booking.planType
            }
        }));

        return NextResponse.json({ payments: formattedPayments });
    } catch (error) {
        console.error("Get payments error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
