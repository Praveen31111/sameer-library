"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

// Icons
const TrendingUpIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
);

const UsersIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const TicketIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    </svg>
);

const CreditCardIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
);

const GridIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
    </svg>
);

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [pendingBookings, setPendingBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch stats and pending bookings in parallel
                const [statsRes, bookingsRes] = await Promise.all([
                    fetch("/api/admin/stats"),
                    fetch("/api/admin/bookings?status=pending")
                ]);

                const statsData = await statsRes.json();
                const bookingsData = await bookingsRes.json();

                if (statsData.stats) setStats(statsData);
                if (bookingsData.bookings) setPendingBookings(bookingsData.bookings.slice(0, 5)); // Limit to 5

                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleAction = async (id: string, action: "approve" | "reject") => {
        try {
            const res = await fetch("/api/admin/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bookingId: id, action })
            });
            if (res.ok) {
                // Remove from local state
                setPendingBookings(prev => prev.filter(b => b.id !== id));
            }
        } catch (error) {
            console.error("Action failed", error);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;

    const statCards = stats ? [
        {
            label: "Total Students",
            value: stats.stats.totalStudents,
            change: "Active",
            icon: <UsersIcon />,
            color: "var(--primary)",
            bg: "rgba(13, 148, 136, 0.1)"
        },
        {
            label: "Active Bookings",
            value: stats.stats.activeBookings,
            change: "Current",
            icon: <TicketIcon />,
            color: "var(--info)",
            bg: "rgba(59, 130, 246, 0.1)"
        },
        {
            label: "Revenue (Month)",
            value: `₹${stats.stats.revenue}`,
            change: "Total",
            icon: <CreditCardIcon />,
            color: "var(--success)",
            bg: "rgba(34, 197, 94, 0.1)"
        },
        {
            label: "Occupancy",
            value: `${stats.stats.occupancyRate}%`,
            change: `${stats.stats.totalSeats} seats`,
            icon: <GridIcon />,
            color: "var(--accent)",
            bg: "rgba(245, 158, 11, 0.1)"
        },
    ] : [];

    return (
        <div>
            {/* Stats Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1rem",
                marginBottom: "2rem"
            }}>
                {statCards.map((stat, i) => (
                    <div key={i} className="card" style={{ padding: "1.25rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                                    {stat.label}
                                </p>
                                <p style={{ fontSize: "1.75rem", fontWeight: 700 }}>{stat.value}</p>
                                <p style={{
                                    color: "var(--text-secondary)",
                                    fontSize: "0.875rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.25rem"
                                }}>
                                    <TrendingUpIcon />
                                    {stat.change}
                                </p>
                            </div>
                            <div style={{
                                width: "48px",
                                height: "48px",
                                background: stat.bg,
                                color: stat.color,
                                borderRadius: "var(--radius-sm)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr",
                gap: "1.5rem"
            }} className="admin-grid">
                {/* Pending Bookings */}
                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h3 style={{ fontWeight: 600 }}>Pending Approvals</h3>
                        <Link href="/admin/bookings" style={{ color: "var(--primary)", fontSize: "0.875rem", textDecoration: "none" }}>
                            View All →
                        </Link>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {pendingBookings.length === 0 && <div className="text-muted text-sm">No pending approvals</div>}
                        {pendingBookings.map(booking => (
                            <div key={booking.id} style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "1rem",
                                background: "var(--surface-hover)",
                                borderRadius: "var(--radius-sm)"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                    <div style={{
                                        width: "44px",
                                        height: "44px",
                                        background: "var(--primary)",
                                        color: "white",
                                        borderRadius: "var(--radius-sm)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 600
                                    }}>
                                        {booking.seat}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 500 }}>{booking.student.name}</p>
                                        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                                            {booking.room} • {booking.planType}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                    <span style={{ fontWeight: 600, color: "var(--primary)" }}>₹{booking.amount}</span>
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
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {/* Live Occupancy */}
                    <div className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <h3 style={{ fontWeight: 600 }}>Live Occupancy</h3>
                            <span className="badge badge-success">
                                <span style={{ width: "8px", height: "8px", background: "var(--success)", borderRadius: "50%", marginRight: "0.5rem", animation: "pulse 2s infinite" }}></span>
                                Live
                            </span>
                        </div>

                        {stats && stats.occupancyData.map((room: any, i: number) => (
                            <div key={i} style={{ marginBottom: "1rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                                    <span>{room.room}</span>
                                    <span style={{ color: "var(--text-muted)" }}>{room.occupied}/{room.total}</span>
                                </div>
                                <div style={{
                                    height: "8px",
                                    background: "var(--surface-hover)",
                                    borderRadius: "4px",
                                    overflow: "hidden"
                                }}>
                                    <div style={{
                                        height: "100%",
                                        width: `${room.percentage}%`,
                                        background: room.percentage > 90 ? "var(--error)" : room.percentage > 70 ? "var(--warning)" : "var(--success)",
                                        borderRadius: "4px",
                                        transition: "width 0.5s ease"
                                    }} />
                                </div>
                            </div>
                        ))}

                        <Link href="/admin/live" className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                            View Details
                        </Link>
                    </div>

                    {/* Recent Activity */}
                    <div className="card">
                        <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Recent Activity</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {stats && stats.recentActivity.length === 0 && <div className="text-muted text-sm">No recent activity</div>}
                            {stats && stats.recentActivity.map((activity: any, i: number) => (
                                <div key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                                    <span style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        minWidth: "60px"
                                    }}>
                                        {activity.time}
                                    </span>
                                    <span style={{ fontSize: "0.875rem" }}>{activity.event}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Responsive */}
            <style jsx>{`
        @media (max-width: 1024px) {
          .admin-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
        </div>
    );
}
