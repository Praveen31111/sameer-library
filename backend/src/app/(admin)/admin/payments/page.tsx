"use client";

import { useState, useEffect } from "react";

export default function PaymentsAdminPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/payments")
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

    const handleExport = () => {
        // Simple CSV implementation
        const headers = ["ID,Student,Email,Amount,Date,Status,Method"];
        const rows = payments.map(p =>
            `${p.id},"${p.studentName}","${p.studentEmail}",${p.amount},${p.date},${p.status},${p.method}`
        );
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "payments_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calculate aggregated stats
    const totalRevenue = payments.reduce((sum, p) => p.status === 'success' ? sum + p.amount : sum, 0);
    const totalTransactions = payments.length;

    if (loading) return <div className="p-8 text-center">Loading payments...</div>;

    return (
        <div>
            {/* Revenue Stats */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "1rem",
                marginBottom: "2rem"
            }}>
                <div className="stat-card" style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)", color: "white" }}>
                    <p style={{ opacity: 0.9, fontSize: "0.875rem" }}>Total Revenue</p>
                    <p style={{ fontSize: "2rem", fontWeight: 700 }}>₹{totalRevenue.toLocaleString()}</p>
                    <p style={{ fontSize: "0.875rem" }}>All time</p>
                </div>
                <div className="stat-card">
                    <p className="stat-label">Transactions</p>
                    <p className="stat-value">{totalTransactions}</p>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
                <button className="btn btn-secondary" onClick={handleExport}>
                    📥 Export to CSV
                </button>
            </div>

            {/* Payments Table */}
            <div className="card" style={{ overflow: "auto" }}>
                {payments.length === 0 ? (
                    <div className="text-center py-8 text-muted">No transactions found.</div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Transaction ID</th>
                                <th>Student</th>
                                <th>Date</th>
                                <th>Method</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map(payment => (
                                <tr key={payment.id}>
                                    <td style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>{payment.transactionId.slice(-8)}</td>
                                    <td style={{ fontWeight: 500 }}>
                                        {payment.studentName}
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>{payment.plan}</div>
                                    </td>
                                    <td>{payment.date}</td>
                                    <td>{payment.method}</td>
                                    <td style={{ fontWeight: 600 }}>₹{payment.amount}</td>
                                    <td>
                                        <span className={`badge ${payment.status === "success" ? "badge-success" : "badge-error"}`}>
                                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
