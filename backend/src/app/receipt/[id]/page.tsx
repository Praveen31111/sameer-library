import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

interface ReceiptPageProps {
    params: Promise<{ id: string }>;
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
            student: { select: { name: true, email: true, phone: true } },
            seat: { select: { seatNumber: true } },
            room: { select: { name: true } },
            branch: { select: { name: true, address: true, city: true, code: true } },
            payments: { orderBy: { createdAt: "desc" } }
        }
    });

    if (!booking) {
        notFound();
    }

    const totalFee = booking.totalFee || booking.amount || 0;
    const paidAmount = booking.paidAmount || 0;
    const dueAmount = booking.dueAmount !== undefined ? booking.dueAmount : Math.max(0, totalFee - paidAmount);
    const isPaid = dueAmount === 0;

    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: "2rem 1rem",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start"
        }}>
            <div style={{
                maxWidth: "600px",
                width: "100%",
                backgroundColor: "#1e293b",
                borderRadius: "16px",
                padding: "2rem",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
                border: "1px solid #334155"
            }}>
                {/* Header */}
                <div style={{ textAlign: "center", borderBottom: "1px dashed #475569", paddingBottom: "1.5rem", marginBottom: "1.5rem" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>🏛️</div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: "700", margin: "0 0 0.25rem 0", color: "#38bdf8" }}>
                        SAMEER DIGITAL LIBRARY
                    </h1>
                    <p style={{ margin: 0, fontSize: "0.875rem", color: "#94a3b8" }}>
                        {booking.branch.name} • {booking.branch.address}, {booking.branch.city}
                    </p>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                        Official Student Fee Due & Receipt Statement
                    </p>
                </div>

                {/* Status Banner */}
                <div style={{
                    backgroundColor: isPaid ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    border: `1px solid ${isPaid ? "#22c55e" : "#ef4444"}`,
                    color: isPaid ? "#4ade80" : "#f87171",
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1.5rem"
                }}>
                    <span style={{ fontWeight: 600 }}>STATUS: {isPaid ? "ALL FEES CLEARED (PAID)" : "PAYMENT DUE"}</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                        {isPaid ? "₹0 Due" : `₹${dueAmount} Baki`}
                    </span>
                </div>

                {/* Student & Seat Details */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div style={{ backgroundColor: "#0f172a", padding: "0.75rem 1rem", borderRadius: "8px" }}>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>STUDENT NAME</div>
                        <div style={{ fontWeight: 600, fontSize: "1rem" }}>{booking.student.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{booking.student.phone || "No phone"}</div>
                    </div>
                    <div style={{ backgroundColor: "#0f172a", padding: "0.75rem 1rem", borderRadius: "8px" }}>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>RESERVED SEAT</div>
                        <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fbbf24" }}>
                            Seat {booking.seat.seatNumber}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{booking.room.name}</div>
                    </div>
                </div>

                {/* Plan & Cycle */}
                <div style={{ backgroundColor: "#0f172a", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Plan Type</span>
                        <span style={{ fontWeight: 600 }}>{booking.planType}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Valid From</span>
                        <span>{new Date(booking.startDate).toLocaleDateString("en-IN")}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Due / Renewal Date</span>
                        <span style={{ color: "#f87171", fontWeight: 600 }}>
                            {booking.nextDueDate ? new Date(booking.nextDueDate).toLocaleDateString("en-IN") : new Date(booking.endDate).toLocaleDateString("en-IN")}
                        </span>
                    </div>
                </div>

                {/* Fee Breakdown Table */}
                <div style={{ borderTop: "1px solid #334155", paddingTop: "1rem", marginBottom: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0" }}>
                        <span style={{ color: "#94a3b8" }}>Total Monthly Fee</span>
                        <span style={{ fontWeight: 600 }}>₹{totalFee}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", color: "#4ade80" }}>
                        <span>Amount Paid (Received)</span>
                        <span style={{ fontWeight: 600 }}>₹{paidAmount}</span>
                    </div>
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "0.75rem 0",
                        borderTop: "1px solid #475569",
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: isPaid ? "#4ade80" : "#f87171"
                    }}>
                        <span>Net Outstanding Due</span>
                        <span>₹{dueAmount}</span>
                    </div>
                </div>

                {/* Payment History / Receipts */}
                {booking.payments.length > 0 && (
                    <div style={{ marginBottom: "1.5rem" }}>
                        <h3 style={{ fontSize: "0.875rem", color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                            Recent Transactions
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {booking.payments.map(p => (
                                <div key={p.id} style={{
                                    backgroundColor: "#0f172a",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "6px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    fontSize: "0.8125rem"
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>₹{p.amount} ({p.paymentMode})</div>
                                        <div style={{ color: "#64748b", fontSize: "0.75rem" }}>
                                            {new Date(p.createdAt).toLocaleDateString("en-IN")} • {p.receiptNumber || "Direct"}
                                        </div>
                                    </div>
                                    <span style={{ color: "#22c55e", fontWeight: 600 }}>PAID</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer Notes */}
                <div style={{ textAlign: "center", color: "#64748b", fontSize: "0.75rem", marginTop: "2rem" }}>
                    <p style={{ margin: 0 }}>This is a computer generated library billing receipt.</p>
                    <p style={{ margin: "0.25rem 0 0 0" }}>Sameer Digital Library • Keep this for your records.</p>
                </div>
            </div>
        </div>
    );
}
