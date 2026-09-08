"use client";

import { useState, useEffect } from "react";

interface DueStudent {
    id: string; // bookingId
    studentId: string;
    studentName: string;
    studentPhone: string;
    studentEmail: string;
    seatNumber: string;
    roomName: string;
    branchName: string;
    planType: string;
    totalFee: number;
    paidAmount: number;
    dueAmount: number;
    paymentStatus: string;
    startDate: string;
    endDate: string;
    nextDueDate: string;
    daysRemainingOrOverdue: number;
    isOverdue: boolean;
    lastReminderSentAt?: string;
    reminderCount: number;
}

export default function PaymentsAdminPage() {
    const [activeTab, setActiveTab] = useState<"dues" | "transactions">("dues");
    const [payments, setPayments] = useState<any[]>([]);
    const [duesData, setDuesData] = useState<{ stats: any; students: DueStudent[] }>({
        stats: {
            totalRevenueCollected: 0,
            totalDueOutstanding: 0,
            overdueStudentsCount: 0,
            dueStudentsCount: 0,
            fullyPaidStudentsCount: 0,
            totalActiveSeats: 0
        },
        students: []
    });
    const [duesFilter, setDuesFilter] = useState<"ALL" | "DUE" | "OVERDUE" | "PAID">("ALL");
    const [loading, setLoading] = useState(true);

    // Modal state for Collecting Cash
    const [selectedBooking, setSelectedBooking] = useState<DueStudent | null>(null);
    const [collectAmount, setCollectAmount] = useState<string>("");
    const [collectMode, setCollectMode] = useState<string>("OFFLINE_CASH");
    const [collectRemarks, setCollectRemarks] = useState<string>("");
    const [submittingPayment, setSubmittingPayment] = useState(false);
    const [reminderLoadingId, setReminderLoadingId] = useState<string | null>(null);
    const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [payRes, duesRes] = await Promise.all([
                fetch("/api/admin/payments"),
                fetch(`/api/admin/payments/dues?filter=${duesFilter}`)
            ]);

            const payData = await payRes.json();
            const duesResult = await duesRes.json();

            if (payData.payments) setPayments(payData.payments);
            if (duesResult.stats && duesResult.students) {
                setDuesData(duesResult);
            }
        } catch (err) {
            console.error("Failed to fetch payments data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [duesFilter]);

    // Handle 0-Cost WhatsApp Bill Send
    const handleSendWhatsApp = async (booking: DueStudent) => {
        setReminderLoadingId(booking.id);
        setFeedbackMsg(null);
        try {
            const res = await fetch("/api/admin/reminders/whatsapp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId: booking.id }),
            });
            const data = await res.json();
            if (data.success && data.whatsappUrl) {
                window.open(data.whatsappUrl, "_blank");
                setFeedbackMsg({
                    type: "success",
                    text: `WhatsApp chat opened for ${booking.studentName}. Reminder logged!`
                });
                // Refresh dues data to update reminder counter
                loadData();
            } else {
                setFeedbackMsg({ type: "error", text: data.error || "Could not open WhatsApp" });
            }
        } catch (err) {
            setFeedbackMsg({ type: "error", text: "Failed to send WhatsApp reminder" });
        } finally {
            setReminderLoadingId(null);
        }
    };

    // Handle Admin Collecting Cash / Partial Payment
    const handleCollectPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBooking) return;

        const amount = Number(collectAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        setSubmittingPayment(true);
        setFeedbackMsg(null);
        try {
            const res = await fetch("/api/admin/payments/collect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId: selectedBooking.id,
                    amount: amount,
                    paymentMode: collectMode,
                    remarks: collectRemarks
                }),
            });

            const data = await res.json();
            if (data.success) {
                setFeedbackMsg({
                    type: "success",
                    text: `₹${amount} recorded successfully for ${selectedBooking.studentName}! Receipt: ${data.receipt?.receiptNumber}`
                });
                setSelectedBooking(null);
                setCollectAmount("");
                setCollectRemarks("");
                loadData();
            } else {
                alert(data.error || "Failed to record payment");
            }
        } catch (err) {
            alert("Error recording payment");
        } finally {
            setSubmittingPayment(false);
        }
    };

    const handleExport = () => {
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

    const stats = duesData.stats;

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>Billing & Fees Management</h1>
                    <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0 0", fontSize: "0.875rem" }}>
                        Track collections, pending dues, overdue alerts & 0-cost WhatsApp billing
                    </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-secondary" onClick={handleExport}>
                        📥 Export CSV
                    </button>
                    <button className="btn btn-primary" onClick={loadData}>
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Feedback Alert */}
            {feedbackMsg && (
                <div style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    marginBottom: "1rem",
                    backgroundColor: feedbackMsg.type === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    border: `1px solid ${feedbackMsg.type === "success" ? "#22c55e" : "#ef4444"}`,
                    color: feedbackMsg.type === "success" ? "#4ade80" : "#f87171",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}>
                    <span>{feedbackMsg.text}</span>
                    <button onClick={() => setFeedbackMsg(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
                </div>
            )}

            {/* Comprehensive Stats Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1rem",
                marginBottom: "2rem"
            }}>
                {/* Collected */}
                <div className="stat-card" style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)", color: "white" }}>
                    <p style={{ opacity: 0.9, fontSize: "0.875rem", margin: 0 }}>Total Collected</p>
                    <p style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0.25rem 0" }}>₹{stats.totalRevenueCollected.toLocaleString()}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem", fontSize: "0.75rem" }}>
                        <span style={{ backgroundColor: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: "4px" }}>
                            💵 Cash: ₹{(stats.cashCollected || 0).toLocaleString()}
                        </span>
                        <span style={{ backgroundColor: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: "4px" }}>
                            📲 GPay: ₹{(stats.gpayCollected || 0).toLocaleString()}
                        </span>
                        <span style={{ backgroundColor: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: "4px" }}>
                            💳 App: ₹{(stats.gatewayCollected || 0).toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Outstanding Dues */}
                <div className="stat-card" style={{ background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)", color: "white" }}>
                    <p style={{ opacity: 0.9, fontSize: "0.875rem", margin: 0 }}>Pending / Due Fees</p>
                    <p style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0.25rem 0" }}>₹{stats.totalDueOutstanding.toLocaleString()}</p>
                    <p style={{ fontSize: "0.75rem", opacity: 0.8, margin: 0 }}>{stats.dueStudentsCount} Students pending</p>
                </div>

                {/* Overdue Alerts */}
                <div className="stat-card" style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)", color: "white" }}>
                    <p style={{ opacity: 0.9, fontSize: "0.875rem", margin: 0 }}>Overdue Defaulters</p>
                    <p style={{ fontSize: "1.75rem", fontWeight: 700, margin: "0.25rem 0" }}>{stats.overdueStudentsCount}</p>
                    <p style={{ fontSize: "0.75rem", opacity: 0.8, margin: 0 }}>Exceeded cycle date</p>
                </div>

                {/* Fully Paid Ratio */}
                <div className="stat-card">
                    <p className="stat-label">Fully Paid Students</p>
                    <p className="stat-value">{stats.fullyPaidStudentsCount} / {stats.totalActiveSeats}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                        {stats.totalActiveSeats > 0 ? Math.round((stats.fullyPaidStudentsCount / stats.totalActiveSeats) * 100) : 0}% Cleared
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem" }}>
                <button
                    onClick={() => setActiveTab("dues")}
                    style={{
                        padding: "0.75rem 1.25rem",
                        background: "none",
                        border: "none",
                        borderBottom: activeTab === "dues" ? "2px solid var(--primary)" : "none",
                        color: activeTab === "dues" ? "var(--primary)" : "var(--text-muted)",
                        fontWeight: activeTab === "dues" ? 600 : 400,
                        cursor: "pointer",
                        fontSize: "1rem"
                    }}
                >
                    📋 Student Dues & WhatsApp Reminder ({stats.dueStudentsCount})
                </button>
                <button
                    onClick={() => setActiveTab("transactions")}
                    style={{
                        padding: "0.75rem 1.25rem",
                        background: "none",
                        border: "none",
                        borderBottom: activeTab === "transactions" ? "2px solid var(--primary)" : "none",
                        color: activeTab === "transactions" ? "var(--primary)" : "var(--text-muted)",
                        fontWeight: activeTab === "transactions" ? 600 : 400,
                        cursor: "pointer",
                        fontSize: "1rem"
                    }}
                >
                    💳 Transaction History Log ({payments.length})
                </button>
            </div>

            {/* TAB 1: DUES MANAGEMENT */}
            {activeTab === "dues" && (
                <div>
                    {/* Sub-filters */}
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                        {(["ALL", "DUE", "OVERDUE", "PAID"] as const).map(filterKey => (
                            <button
                                key={filterKey}
                                onClick={() => setDuesFilter(filterKey)}
                                style={{
                                    padding: "0.4rem 0.8rem",
                                    borderRadius: "20px",
                                    border: "1px solid var(--border)",
                                    fontSize: "0.8125rem",
                                    cursor: "pointer",
                                    backgroundColor: duesFilter === filterKey ? "var(--primary)" : "transparent",
                                    color: duesFilter === filterKey ? "#fff" : "var(--text)"
                                }}
                            >
                                {filterKey === "ALL" && `All Students (${duesData.students.length})`}
                                {filterKey === "DUE" && `Dues Pending (${stats.dueStudentsCount})`}
                                {filterKey === "OVERDUE" && `⚠️ Overdue (${stats.overdueStudentsCount})`}
                                {filterKey === "PAID" && `Fully Paid (${stats.fullyPaidStudentsCount})`}
                            </button>
                        ))}
                    </div>

                    {/* Dues Table */}
                    <div className="card" style={{ overflow: "auto" }}>
                        {loading ? (
                            <div className="text-center py-8">Loading dues ledger...</div>
                        ) : duesData.students.length === 0 ? (
                            <div className="text-center py-8 text-muted">No students matching this filter.</div>
                        ) : (
                            <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Seat & Branch</th>
                                        <th>Total Fee</th>
                                        <th>Paid</th>
                                        <th>Balance Due</th>
                                        <th>Status</th>
                                        <th>Due Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {duesData.students.map(student => (
                                        <tr key={student.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{student.studentName}</div>
                                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{student.studentPhone}</div>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 700, color: "var(--primary)" }}>Seat {student.seatNumber}</span>
                                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{student.branchName} • {student.planType}</div>
                                            </td>
                                            <td style={{ fontWeight: 500 }}>₹{student.totalFee}</td>
                                            <td style={{ color: "#22c55e", fontWeight: 600 }}>₹{student.paidAmount}</td>
                                            <td>
                                                {student.dueAmount > 0 ? (
                                                    <span style={{
                                                        padding: "0.25rem 0.5rem",
                                                        borderRadius: "4px",
                                                        backgroundColor: student.isOverdue ? "rgba(220, 38, 38, 0.15)" : "rgba(217, 119, 6, 0.15)",
                                                        color: student.isOverdue ? "#ef4444" : "#f59e0b",
                                                        fontWeight: 700
                                                    }}>
                                                        ₹{student.dueAmount} Baki
                                                    </span>
                                                ) : (
                                                    <span style={{ color: "#22c55e", fontWeight: 600 }}>₹0 (Cleared)</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`badge ${
                                                    student.paymentStatus === "PAID"
                                                        ? "badge-success"
                                                        : student.paymentStatus === "OVERDUE"
                                                        ? "badge-error"
                                                        : "badge-warning"
                                                }`}>
                                                    {student.paymentStatus}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: "0.8125rem" }}>
                                                {new Date(student.nextDueDate).toLocaleDateString("en-IN")}
                                                {student.isOverdue && (
                                                    <div style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 600 }}>
                                                        {Math.abs(student.daysRemainingOrOverdue)} days late
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                                    {/* Collect Cash Button */}
                                                    {student.dueAmount > 0 && (
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => {
                                                                setSelectedBooking(student);
                                                                setCollectAmount(student.dueAmount.toString());
                                                            }}
                                                            style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                                                        >
                                                            💵 Collect Cash
                                                        </button>
                                                    )}

                                                    {/* WhatsApp Reminder Button (0-Cost) */}
                                                    <button
                                                        className="btn btn-sm"
                                                        onClick={() => handleSendWhatsApp(student)}
                                                        disabled={reminderLoadingId === student.id}
                                                        style={{
                                                            fontSize: "0.75rem",
                                                            padding: "0.3rem 0.6rem",
                                                            backgroundColor: "#25D366",
                                                            color: "white",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        {reminderLoadingId === student.id ? "Opening..." : "📲 WhatsApp"}
                                                    </button>
                                                </div>
                                                {student.lastReminderSentAt && (
                                                    <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                                                        Sent {student.reminderCount}x (Last: {new Date(student.lastReminderSentAt).toLocaleDateString("en-IN")})
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: TRANSACTIONS HISTORY */}
            {activeTab === "transactions" && (
                <div className="card" style={{ overflow: "auto" }}>
                    {payments.length === 0 ? (
                        <div className="text-center py-8 text-muted">No transactions recorded yet.</div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Receipt / Txn</th>
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
                                        <td style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                                            {payment.transactionId?.slice(-10) || payment.id.slice(-8)}
                                        </td>
                                        <td style={{ fontWeight: 500 }}>
                                            {payment.studentName}
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{payment.plan}</div>
                                        </td>
                                        <td>{payment.date}</td>
                                        <td>{payment.method}</td>
                                        <td style={{ fontWeight: 600 }}>₹{payment.amount}</td>
                                        <td>
                                            <span className={`badge ${payment.status === "success" ? "badge-success" : "badge-error"}`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* MODAL: COLLECT CASH / PARTIAL PAYMENT */}
            {selectedBooking && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1000,
                    padding: "1rem"
                }}>
                    <div style={{
                        backgroundColor: "var(--card-bg, #1e293b)",
                        color: "var(--text, #fff)",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        maxWidth: "450px",
                        width: "100%",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
                        border: "1px solid var(--border, #334155)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>💵 Collect Fee Payment</h2>
                            <button
                                onClick={() => setSelectedBooking(null)}
                                style={{ background: "none", border: "none", color: "inherit", fontSize: "1.25rem", cursor: "pointer" }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "0.75rem", borderRadius: "8px", marginBottom: "1rem" }}>
                            <div style={{ fontWeight: 600, fontSize: "1rem" }}>{selectedBooking.studentName}</div>
                            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                                Seat {selectedBooking.seatNumber} • Total Fee: ₹{selectedBooking.totalFee}
                            </div>
                            <div style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                                <span>Already Paid: <b style={{ color: "#22c55e" }}>₹{selectedBooking.paidAmount}</b></span>
                                <span style={{ marginLeft: "1rem" }}>Current Due: <b style={{ color: "#ef4444" }}>₹{selectedBooking.dueAmount}</b></span>
                            </div>
                        </div>

                        <form onSubmit={handleCollectPayment}>
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                                    Amount Received (₹)*
                                </label>
                                <input
                                    type="number"
                                    className="input"
                                    value={collectAmount}
                                    onChange={e => setCollectAmount(e.target.value)}
                                    placeholder="Enter amount (e.g. 500)"
                                    required
                                    min="1"
                                    max={selectedBooking.dueAmount}
                                    style={{ width: "100%", fontSize: "1.1rem", fontWeight: 600 }}
                                />
                            </div>

                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                                    Payment Method
                                </label>
                                <select
                                    className="input"
                                    value={collectMode}
                                    onChange={e => setCollectMode(e.target.value)}
                                    style={{ width: "100%" }}
                                >
                                    <option value="OFFLINE_CASH">Cash (Library Reception Counter)</option>
                                    <option value="COUNTER_UPI">Counter QR Scanner / UPI</option>
                                    <option value="BANK_TRANSFER">Bank Account Transfer / NEFT</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: "1.5rem" }}>
                                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                                    Remarks / Notes (Optional)
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    value={collectRemarks}
                                    onChange={e => setCollectRemarks(e.target.value)}
                                    placeholder="e.g. Cash paid for 2nd installment"
                                    style={{ width: "100%" }}
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setSelectedBooking(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submittingPayment}
                                >
                                    {submittingPayment ? "Saving..." : "Confirm & Save Receipt"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
