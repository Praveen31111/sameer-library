
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
                student: { select: { name: true, email: true } },
                booking: {
                    select: {
                        planType: true, // planType is the field name in schema
                        amount: true
                    }
                }
            }
        });

        const formattedPayments = payments.map(p => ({
            id: p.id,
            transactionId: p.providerPaymentId || p.id,
            studentName: p.student.name,
            studentEmail: p.student.email,
            amount: p.amount,
            plan: p.booking.planType,
            date: new Date(p.createdAt).toLocaleDateString(),
            status: p.status.toLowerCase(),
            method: p.provider
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
