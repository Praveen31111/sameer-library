"use client";

import { useState, useEffect } from "react";

const getStatusBadge = (status: string, paymentStatus?: string, paymentMode?: string) => {
    switch (status) {
        case "pending":
            return <span className="badge badge-warning">Pending Review</span>;
        case "approved":
            if (paymentStatus === "DUE") {
                return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span className="badge badge-success">Approved</span>
                        <span style={{ fontSize: "0.6875rem", color: "#f59e0b", fontWeight: 700 }}>⚠️ Payment Due</span>
                    </div>
                );
            }
            if (paymentStatus === "PARTIAL") {
                return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span className="badge badge-success">Approved</span>
                        <span style={{ fontSize: "0.6875rem", color: "#38bdf8", fontWeight: 700 }}>Partial Paid</span>
                    </div>
                );
            }

            // Distinguish Payment Source
            let modeLabel = "Paid (Cash)";
            let modeColor = "#22c55e";
            if (paymentMode === "ADMIN_GPAY" || paymentMode === "COUNTER_UPI") {
                modeLabel = "Paid (Admin GPay/UPI)";
                modeColor = "#0284c7";
            } else if (paymentMode === "ONLINE_GATEWAY") {
                modeLabel = "Paid (App Gateway)";
                modeColor = "#8b5cf6";
            }

            return (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span className="badge badge-success">Approved</span>
                    <span style={{ fontSize: "0.6875rem", color: modeColor, fontWeight: 700 }}>✓ {modeLabel}</span>
                </div>
            );
        case "rejected":
            return <span className="badge badge-error">Rejected</span>;
        default:
            return <span className="badge badge-neutral">{status}</span>;
    }
};

export default function AdminBookingsPage() {
    const [filter, setFilter] = useState("all");
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state for Approval choices
    const [selectedBookingForApproval, setSelectedBookingForApproval] = useState<any | null>(null);
    const [approvalPaymentAction, setApprovalPaymentAction] = useState<"PAID" | "DUE">("PAID");
    const [approvalPaymentMode, setApprovalPaymentMode] = useState<"OFFLINE_CASH" | "ADMIN_GPAY">("OFFLINE_CASH");
    const [approvalUpiRef, setApprovalUpiRef] = useState("");
    const [approvalRemarks, setApprovalRemarks] = useState("");
    const [processingApproval, setProcessingApproval] = useState(false);

    const fetchBookings = (status: string) => {
        setLoading(true);
        fetch(`/api/admin/bookings?status=${status}`)
            .then(res => res.json())
            .then(data => {
                if (data.bookings) setBookings(data.bookings);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch bookings", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchBookings(filter);
    }, [filter]);

    const handleConfirmApproval = async () => {
        if (!selectedBookingForApproval) return;
        setProcessingApproval(true);

        try {
            const res = await fetch("/api/admin/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bookingId: selectedBookingForApproval.id,
                    action: "approve",
                    paymentAction: approvalPaymentAction, // "PAID" vs "DUE"
                    paymentMode: approvalPaymentMode,
                    referenceId: approvalUpiRef,
                    remarks: approvalRemarks
                })
            });

            const data = await res.json();
            if (res.ok) {
                const methodText = approvalPaymentAction === "DUE" 
                    ? "Seat Approved with Due Balance (Pay Later)."
                    : (approvalPaymentMode === "ADMIN_GPAY" ? "Seat Approved! (Paid via Admin GPay/UPI)" : "Seat Approved! (Paid via Cash)");
                alert(methodText);
                setSelectedBookingForApproval(null);
                setApprovalUpiRef("");
                fetchBookings(filter);
            } else {
                alert(data.error || "Approval failed");
            }
        } catch (error) {
            console.error("Approval error", error);
            alert("Error approving booking");
        } finally {
            setProcessingApproval(false);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm("Are you sure you want to reject this booking?")) return;

        try {
            const res = await fetch("/api/admin/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId: id, action: "reject" })
            });

            if (res.ok) {
                fetchBookings(filter);
                alert("Booking rejected successfully");
            } else {
                alert("Action failed");
            }
        } catch (error) {
            console.error("Reject error", error);
        }
    };

    const pendingCount = bookings.filter(b => b.status === "pending").length;

    return (
        <div>
            {/* Header & Stats */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>Admission & Seat Bookings</h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: "0.25rem 0 0 0" }}>
                        Approve student admissions with or without upfront payment
                    </p>
                </div>
                <div className="stat-card" style={{ padding: "0.5rem 1rem", minWidth: "140px" }}>
                    <p className="stat-value" style={{ color: "var(--warning)", fontSize: "1.5rem" }}>{pendingCount}</p>
                    <p className="stat-label" style={{ fontSize: "0.75rem" }}>Pending Approval</p>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                {["all", "pending", "approved", "rejected"].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Bookings Table */}
            <div className="card" style={{ overflow: "auto" }}>
                {loading ? (
                    <div className="p-8 text-center">Loading bookings...</div>
                ) : (
                    <table className="table" style={{ width: "100%" }}>
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Seat & Branch</th>
                                <th>Dates</th>
                                <th>Plan</th>
                                <th>Fee Details</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map(booking => (
                                <tr key={booking.id}>
                                    <td>
                                        <div>
                                            <p style={{ fontWeight: 600, margin: 0 }}>{booking.student.name}</p>
                                            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0 }}>
                                                {booking.student.phone || booking.student.email}
                                            </p>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 700, color: "var(--primary)" }}>Seat {booking.seat}</span>
                                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                            {booking.room} • {booking.branch}
                                        </div>
                                    </td>
                                    <td style={{ fontSize: "0.8125rem" }}>
                                        {new Date(booking.startDate).toLocaleDateString("en-IN")}
                                        <br />
                                        <span className="text-xs text-muted">to {new Date(booking.endDate).toLocaleDateString("en-IN")}</span>
                                    </td>
                                    <td>{booking.planType}</td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>₹{booking.amount}</div>
                                        {booking.dueAmount > 0 && (
                                            <span style={{ color: "#ef4444", fontSize: "0.75rem", fontWeight: 600 }}>
                                                Due: ₹{booking.dueAmount}
                                            </span>
                                        )}
                                    </td>
                                    <td>{getStatusBadge(booking.status, booking.paymentStatus, booking.paymentMode)}</td>
                                    <td>
                                        {booking.status === "pending" ? (
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => {
                                                        setSelectedBookingForApproval(booking);
                                                        setApprovalPaymentAction("PAID");
                                                        setApprovalPaymentMode("OFFLINE_CASH");
                                                        setApprovalUpiRef("");
                                                        setApprovalRemarks("");
                                                    }}
                                                >
                                                    Approve...
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => handleReject(booking.id)}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                                <a
                                                    href={`/admin/pass/${booking.id}`}
                                                    target="_blank"
                                                    className="btn btn-sm btn-secondary"
                                                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                                                >
                                                    🪪 Print Pass
                                                </a>
                                                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                                    {new Date(booking.createdAt).toLocaleDateString("en-IN")}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {!loading && bookings.length === 0 && (
                    <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                        No bookings found
                    </div>
                )}
            </div>

            {/* APPROVAL MODAL (Approve with Cash / Admin GPay OR Approve Without Payment) */}
            {selectedBookingForApproval && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    display: "flex", justifyContent: "center", alignItems: "center",
                    zIndex: 1000, padding: "1rem"
                }}>
                    <div style={{
                        backgroundColor: "var(--card-bg, #1e293b)",
                        color: "var(--text, #fff)",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        maxWidth: "480px",
                        width: "100%",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
                        border: "1px solid var(--border, #334155)"
                    }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Approve Student Admission</h2>
                            <button
                                onClick={() => setSelectedBookingForApproval(null)}
                                style={{ background: "none", border: "none", color: "inherit", fontSize: "1.25rem", cursor: "pointer" }}
                            >✕</button>
                        </div>

                        <div style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "0.75rem", borderRadius: "8px", marginBottom: "1.25rem" }}>
                            <div style={{ fontWeight: 600, fontSize: "1rem" }}>{selectedBookingForApproval.student.name}</div>
                            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                                Seat {selectedBookingForApproval.seat} • {selectedBookingForApproval.planType} • Total Fee: <b>₹{selectedBookingForApproval.amount}</b>
                            </div>
                        </div>

                        <div style={{ marginBottom: "1.25rem" }}>
                            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                                Payment Kaise Aaya? Select Karein:
                            </label>

                            {/* Option 1: Cash at counter */}
                            <label style={{
                                display: "flex", alignItems: "flex-start", gap: "0.75rem",
                                padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)",
                                marginBottom: "0.5rem", cursor: "pointer",
                                backgroundColor: (approvalPaymentAction === "PAID" && approvalPaymentMode === "OFFLINE_CASH") ? "rgba(34, 197, 94, 0.12)" : "transparent"
                            }}>
                                <input
                                    type="radio"
                                    name="paymentOption"
                                    checked={approvalPaymentAction === "PAID" && approvalPaymentMode === "OFFLINE_CASH"}
                                    onChange={() => {
                                        setApprovalPaymentAction("PAID");
                                        setApprovalPaymentMode("OFFLINE_CASH");
                                    }}
                                    style={{ marginTop: "3px" }}
                                />
                                <div>
                                    <div style={{ fontWeight: 600, color: "#4ade80" }}>
                                        💵 Cash Received at Counter (₹{selectedBookingForApproval.amount})
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                        Student ne reception par physical cash diya. Receipt generated with ₹0 Due.
                                    </div>
                                </div>
                            </label>

                            {/* Option 2: Admin GPay / PhonePe */}
                            <label style={{
                                display: "flex", alignItems: "flex-start", gap: "0.75rem",
                                padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)",
                                marginBottom: "0.5rem", cursor: "pointer",
                                backgroundColor: (approvalPaymentAction === "PAID" && approvalPaymentMode === "ADMIN_GPAY") ? "rgba(2, 132, 199, 0.15)" : "transparent"
                            }}>
                                <input
                                    type="radio"
                                    name="paymentOption"
                                    checked={approvalPaymentAction === "PAID" && approvalPaymentMode === "ADMIN_GPAY"}
                                    onChange={() => {
                                        setApprovalPaymentAction("PAID");
                                        setApprovalPaymentMode("ADMIN_GPAY");
                                    }}
                                    style={{ marginTop: "3px" }}
                                />
                                <div>
                                    <div style={{ fontWeight: 600, color: "#38bdf8" }}>
                                        📲 Admin GPay / PhonePe / Direct QR (₹{selectedBookingForApproval.amount})
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                        Student ne Admin ke personal ya desk QR code par online bheja.
                                    </div>
                                </div>
                            </label>

                            {/* Option 3: Approve Without Payment */}
                            <label style={{
                                display: "flex", alignItems: "flex-start", gap: "0.75rem",
                                padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)",
                                cursor: "pointer",
                                backgroundColor: approvalPaymentAction === "DUE" ? "rgba(245, 158, 11, 0.12)" : "transparent"
                            }}>
                                <input
                                    type="radio"
                                    name="paymentOption"
                                    checked={approvalPaymentAction === "DUE"}
                                    onChange={() => setApprovalPaymentAction("DUE")}
                                    style={{ marginTop: "3px" }}
                                />
                                <div>
                                    <div style={{ fontWeight: 600, color: "#fbbf24" }}>
                                        🟡 Approve Without Payment (Pay Later / Due)
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                        Seat confirm ho jayegi. Student baad me dega. ₹{selectedBookingForApproval.amount} Due Balance me jayega.
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* UTR / Reference ID (Only if Admin GPay) */}
                        {approvalPaymentAction === "PAID" && approvalPaymentMode === "ADMIN_GPAY" && (
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                                    UPI / UTR Transaction ID (Optional):
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    value={approvalUpiRef}
                                    onChange={e => setApprovalUpiRef(e.target.value)}
                                    placeholder="e.g. 423871928371 (from GPay / PhonePe receipt)"
                                    style={{ width: "100%" }}
                                />
                            </div>
                        )}

                        {/* Remarks */}
                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                                Notes / Remarks (Optional):
                            </label>
                            <input
                                type="text"
                                className="input"
                                value={approvalRemarks}
                                onChange={e => setApprovalRemarks(e.target.value)}
                                placeholder={approvalPaymentAction === "DUE" ? "e.g. Will pay remaining fee on 15th" : "Full fee received"}
                                style={{ width: "100%" }}
                            />
                        </div>

                        {/* Modal Action Buttons */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setSelectedBookingForApproval(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleConfirmApproval}
                                disabled={processingApproval}
                            >
                                {processingApproval ? "Confirming..." : "Confirm Approval"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
