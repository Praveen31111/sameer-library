import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payments = await prisma.payment.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                student: { select: { name: true, email: true, phone: true } },
                booking: {
                    select: {
                        planType: true,
                        amount: true,
                        seat: { select: { seatNumber: true } },
                        room: { select: { name: true } },
                        branch: { select: { name: true } },
                    }
                }
            }
        });

        const formattedPayments = payments.map(p => ({
            id: p.id,
            transactionId: p.providerPaymentId || p.id,
            studentName: p.student?.name || "Student",
            studentEmail: p.student?.email || "N/A",
            studentPhone: p.student?.phone || null,
            seatNumber: p.booking?.seat?.seatNumber || "Seat",
            roomName: p.booking?.room?.name || "Main Hall",
            branchName: p.booking?.branch?.name || "Main Library",
            amount: p.amount,
            plan: p.booking?.planType || "MONTHLY",
            date: new Date(p.createdAt).toLocaleDateString(),
            time: new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: p.status.toLowerCase(),
            method: p.provider || "Offline (Cash)"
        }));

        return NextResponse.json({ payments: formattedPayments });
    } catch (error) {
        console.error("Get all payments error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
