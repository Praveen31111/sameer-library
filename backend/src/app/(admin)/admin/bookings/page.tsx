"use client";

import { useState, useEffect } from "react";

const getStatusBadge = (status: string) => {
    switch (status) {
        case "pending": return <span className="badge badge-warning">Pending</span>;
        case "approved": return <span className="badge badge-success">Approved</span>;
        case "rejected": return <span className="badge badge-error">Rejected</span>;
        default: return <span className="badge badge-neutral">{status}</span>;
    }
};

export default function AdminBookingsPage() {
    const [filter, setFilter] = useState("all");
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

    const handleAction = async (id: string, action: "approve" | "reject") => {
        if (!confirm(`Are you sure you want to ${action} this booking?`)) return;

        try {
            const res = await fetch("/api/admin/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId: id, action })
            });

            if (res.ok) {
                // Refresh list
                fetchBookings(filter);
                alert(`Booking ${action}d successfully`);
            } else {
                alert("Action failed");
            }
        } catch (error) {
            console.error("Action error", error);
        }
    };

    // Calculate stats from current view (approximate since we filter via API)
    // Note: To get accurate stats we might need a separate API call or return metadata
    const pendingCount = bookings.filter(b => b.status === "pending").length;

    return (
        <div>
            {/* Stats (simplified for now) */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem"
            }}>
                <div className="stat-card">
                    <p className="stat-value" style={{ color: "var(--warning)" }}>{pendingCount}</p>
                    <p className="stat-label">Shown Pending</p>
                </div>
            </div>

            {/* Filters */}
            <div style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "1.5rem"
            }}>
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
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Seat</th>
                                <th>Dates</th>
                                <th>Plan</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bookings.map(booking => (
                                <tr key={booking.id}>
                                    <td>
                                        <div>
                                            <p style={{ fontWeight: 500 }}>{booking.student.name}</p>
                                            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{booking.student.email}</p>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 600 }}>{booking.seat}</span>
                                        <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}> • {booking.room}</span>
                                    </td>
                                    <td>
                                        {new Date(booking.startDate).toLocaleDateString()}
                                        <br />
                                        <span className="text-xs text-muted">to {new Date(booking.endDate).toLocaleDateString()}</span>
                                    </td>
                                    <td>{booking.planType}</td>
                                    <td style={{ fontWeight: 600 }}>₹{booking.amount}</td>
                                    <td>{getStatusBadge(booking.status)}</td>
                                    <td>
                                        {booking.status === "pending" ? (
                                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => handleAction(booking.id, "approve")}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => handleAction(booking.id, "reject")}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                                                {new Date(booking.createdAt).toLocaleDateString()}
                                            </span>
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
        </div>
    );
}
