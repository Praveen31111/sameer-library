"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

// Icons
const PlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const CalendarIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const ClockIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const CreditCardIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

const MapPinIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

// Mock data
const currentBooking = {
    seat: "A3",
    room: "Silent Zone",
    branch: "Sameer Library - Aliganj",
    validUntil: "Dec 31, 2024",
    plan: "Monthly"
};

const recentAttendance = [
    { date: "Today", checkIn: "09:15 AM", checkOut: "05:30 PM", hours: "8h 15m" },
    { date: "Yesterday", checkIn: "10:00 AM", checkOut: "06:00 PM", hours: "8h 00m" },
    { date: "Dec 4", checkIn: "08:30 AM", checkOut: "04:30 PM", hours: "8h 00m" },
];

const quickActions = [
    { href: "/book", icon: <PlusIcon />, label: "Book a Seat", color: "var(--primary)" },
    { href: "/bookings", icon: <CalendarIcon />, label: "My Bookings", color: "var(--info)" },
    { href: "/payments", icon: <CreditCardIcon />, label: "Payments", color: "var(--success)" },
    { href: "/profile", icon: <MapPinIcon />, label: "Profile", color: "var(--warning)" },
];

export default function StudentDashboard() {
    return (
        <div>
            {/* Header */}
            <div style={{
                background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                padding: "2rem",
                borderRadius: "var(--radius-md)",
                color: "white",
                marginBottom: "2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem"
            }}>
                <div>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                        Hello, Sameer 👋
                    </h1>
                    <p style={{ opacity: 0.9 }}>
                        Welcome back to your study space
                    </p>
                </div>
                <Link href="/book" className="btn" style={{
                    background: "white",
                    color: "var(--primary)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem"
                }}>
                    Book a Seat
                    <ChevronRightIcon />
                </Link>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
                marginBottom: "2rem"
            }}>
                <div className="stat-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <p className="stat-label">This Month</p>
                            <p className="stat-value">24</p>
                            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Days Attended</p>
                        </div>
                        <div className="stat-icon" style={{ background: "rgba(13, 148, 136, 0.1)", color: "var(--primary)" }}>
                            <CalendarIcon />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <p className="stat-label">Total Hours</p>
                            <p className="stat-value">186</p>
                            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>This month</p>
                        </div>
                        <div className="stat-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--info)" }}>
                            <ClockIcon />
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <p className="stat-label">Amount Due</p>
                            <p className="stat-value">₹0</p>
                            <p style={{ fontSize: "0.875rem", color: "var(--success)" }}>All paid ✓</p>
                        </div>
                        <div className="stat-icon" style={{ background: "rgba(34, 197, 94, 0.1)", color: "var(--success)" }}>
                            <CreditCardIcon />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.5rem"
            }} className="dashboard-grid" >
                {/* Current Booking */}
                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h3 style={{ fontWeight: 600 }}>Current Booking</h3>
                        <span className="badge badge-success">Active</span>
                    </div>

                    <div style={{
                        background: "var(--surface-hover)",
                        borderRadius: "var(--radius-sm)",
                        padding: "1.5rem",
                        marginBottom: "1rem"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <div style={{
                                width: "64px",
                                height: "64px",
                                background: "var(--primary)",
                                borderRadius: "var(--radius-sm)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "1.5rem",
                                fontWeight: 700
                            }}>
                                {currentBooking.seat}
                            </div>
                            <div>
                                <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{currentBooking.room}</p>
                                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                    <MapPinIcon />
                                    {currentBooking.branch}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                        <div>
                            <p style={{ color: "var(--text-muted)" }}>Plan</p>
                            <p style={{ fontWeight: 500 }}>{currentBooking.plan}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <p style={{ color: "var(--text-muted)" }}>Valid Until</p>
                            <p style={{ fontWeight: 500 }}>{currentBooking.validUntil}</p>
                        </div>
                    </div>
                </div>

                {/* Recent Attendance */}
                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h3 style={{ fontWeight: 600 }}>Recent Attendance</h3>
                        <Link href="/attendance" style={{ color: "var(--primary)", fontSize: "0.875rem", textDecoration: "none" }}>
                            View All →
                        </Link>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {recentAttendance.map((item, i) => (
                            <div key={i} style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "0.75rem",
                                background: "var(--surface-hover)",
                                borderRadius: "var(--radius-sm)"
                            }}>
                                <div>
                                    <p style={{ fontWeight: 500, fontSize: "0.875rem" }}>{item.date}</p>
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                        {item.checkIn} - {item.checkOut}
                                    </p>
                                </div>
                                <span className="badge badge-info">{item.hours}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: "1.5rem" }}>
                <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Quick Actions</h3>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem"
                }}>
                    {quickActions.map((action, i) => (
                        <Link key={i} href={action.href} className="card" style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            textDecoration: "none",
                            color: "var(--foreground)"
                        }}>
                            <div style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "var(--radius-sm)",
                                background: `${action.color}15`,
                                color: action.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                {action.icon}
                            </div>
                            <span style={{ fontWeight: 500 }}>{action.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Responsive */}
            <style jsx>{`
        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
        </div>
    );
}
