"use client";

import { useState, useEffect } from "react";

const getStatusBadge = (status: string) => {
    switch (status) {
        case "success": return <span className="badge badge-success">Paid</span>;
        case "pending": return <span className="badge badge-warning">Pending</span>;
        case "failed": return <span className="badge badge-error">Failed</span>;
        default: return <span className="badge badge-neutral">{status}</span>;
    }
};

export default function PaymentsPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/payments")
            .then(res => res.json())
            .then(data => {
                if (data.payments) setPayments(data.payments);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch payments", err);
                setLoading(false);
            });
    }, []);

    const totalPaid = payments.filter(p => p.status === "success").reduce((sum, p) => sum + p.amount, 0);

    if (loading) return <div className="p-8 text-center">Loading payments...</div>;

    return (
        <div>
            {/* Summary Cards */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
                marginBottom: "2rem"
            }}>
                <div className="stat-card">
                    <p className="stat-label">Total Paid</p>
                    <p className="stat-value">₹{totalPaid}</p>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>All time</p>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Pending</p>
                    <p className="stat-value">₹0</p>
                    <p style={{ fontSize: "0.875rem", color: "var(--success)" }}>All clear ✓</p>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Transactions</p>
                    <p className="stat-value">{payments.length}</p>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Total</p>
                </div>
            </div>

            {/* Payments Table */}
            <div className="card" style={{ overflow: "auto" }}>
                {payments.length === 0 ? (
                    <div className="text-center py-8 text-muted">No payment history found.</div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Transaction ID</th>
                                <th>Date</th>
                                <th>Booking</th>
                                <th>Method</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(payment => (
                                <tr key={payment.id}>
                                    <td style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>{payment.id.slice(-8)}</td>
                                    <td>{payment.date}</td>
                                    <td>
                                        <span style={{ fontWeight: 500 }}>{payment.booking.seat}</span>
                                        <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}> • {payment.booking.room}</span>
                                    </td>
                                    <td>{payment.method}</td>
                                    <td style={{ fontWeight: 600 }}>₹{payment.amount}</td>
                                    <td>{getStatusBadge(payment.status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

