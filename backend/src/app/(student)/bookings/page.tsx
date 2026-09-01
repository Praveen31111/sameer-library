"use client";

import { useState, useEffect } from "react";
import Script from "next/script";

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function MyBookingsPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);

    const fetchBookings = async () => {
        try {
            const res = await fetch("/api/bookings");
            const data = await res.json();
            if (data.bookings) setBookings(data.bookings);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    const filteredBookings = bookings.filter(b =>
        filter === "all" || b.status === filter
    );

    const handlePayment = async (booking: any) => {
        if (!window.Razorpay) {
            alert("Razorpay SDK not loaded. Please refresh.");
            return;
        }

        try {
            // 1. Create Order
            const orderRes = await fetch("/api/payments/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId: booking.id })
            });

            const orderData = await orderRes.json();
            if (orderData.error) throw new Error(orderData.error);

            // 2. Open Razorpay
            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Sameer Library",
                description: `Booking for ${booking.branch}`,
                order_id: orderData.id,
                handler: async function (response: any) {
                    // 3. Verify Payment
                    try {
                        const verifyRes = await fetch("/api/payments/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                bookingId: booking.id,
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature
                            })
                        });
                        const verifyData = await verifyRes.json();
                        if (verifyData.success) {
                            alert("Payment Successful!");
                            fetchBookings(); // Refresh list to show Paid
                        } else {
                            alert("Payment Verification Failed");
                        }
                    } catch (error) {
                        alert("Verification Error");
                    }
                },
                prefill: {
                    name: "Student Name", // Could fetch from profile if needed
                    email: "student@example.com",
                    contact: "9999999999"
                },
                theme: {
                    color: "#0d9488"
                }
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.open();

        } catch (error: any) {
            console.error("Payment error:", error);
            alert(error.message || "Payment initialization failed");
        }
    };

    const getStatusBadge = (status: string, paymentStatus?: string | null) => {
        if (paymentStatus === 'success') return <span className="badge badge-success">Active & Paid</span>;

        switch (status) {
            case "active": return <span className="badge badge-success">Active</span>;
            case "approved": return <span className="badge badge-info">Approved - Pay Now</span>;
            case "pending": return <span className="badge badge-warning">Pending Approval</span>;
            case "rejected": return <span className="badge badge-error">Rejected</span>;
            case "completed": return <span className="badge badge-neutral">Completed</span>;
            case "cancelled": return <span className="badge badge-error">Cancelled</span>;
            default: return <span className="badge badge-neutral">{status}</span>;
        }
    };

    if (loading) return <div className="p-8 text-center">Loading bookings...</div>;

    return (
        <div>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            {/* Filters */}
            <div style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "1.5rem",
                overflowX: "auto",
                paddingBottom: "0.5rem"
            }}>
                {["all", "pending", "approved", "active", "completed"].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Bookings List */}
            <div style={{ display: "grid", gap: "1rem" }}>
                {filteredBookings.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                        <p style={{ color: "var(--text-muted)" }}>No bookings found</p>
                    </div>
                ) : (
                    filteredBookings.map(booking => (
                        <div key={booking.id} className="card" style={{
                            display: "grid",
                            gridTemplateColumns: "auto 1fr auto",
                            gap: "1.5rem",
                            alignItems: "center"
                        }}>
                            {/* Seat Badge */}
                            <div style={{
                                width: "64px",
                                height: "64px",
                                background: booking.status === "active" || booking.paymentStatus === "success" ? "var(--primary)" : "var(--surface-hover)",
                                color: booking.status === "active" || booking.paymentStatus === "success" ? "white" : "var(--text-secondary)",
                                borderRadius: "var(--radius-sm)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "1.25rem"
                            }}>
                                {booking.seat}
                            </div>

                            {/* Details */}
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                                    <h3 style={{ fontWeight: 600 }}>{booking.room}</h3>
                                    {getStatusBadge(booking.status, booking.paymentStatus)}
                                </div>
                                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                                    📍 {booking.branch}
                                </p>
                                <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.875rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                                    <span>🗓️ {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}</span>
                                    <span>📋 {booking.planType}</span>
                                </div>
                            </div>

                            {/* Amount & Actions */}
                            <div style={{ textAlign: "right" }}>
                                <p style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--primary)" }}>
                                    ₹{booking.amount}
                                </p>
                                {booking.status === "approved" && booking.paymentStatus !== "success" && (
                                    <button
                                        className="btn btn-sm btn-primary"
                                        style={{ marginTop: "0.5rem" }}
                                        onClick={() => handlePayment(booking)}
                                    >
                                        Pay Now
                                    </button>
                                )}
                                {booking.status === "pending" && (
                                    <button className="btn btn-sm btn-secondary" style={{ marginTop: "0.5rem" }}>
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
