"use client";

import { useState, useEffect } from "react";

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

export default function AttendancePage() {
    const [attendance, setAttendance] = useState<any[]>([]);
    const [stats, setStats] = useState({
        daysPresent: 0,
        totalHours: 0,
        avgHoursPerDay: 0,
        streak: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/attendance")
            .then(res => res.json())
            .then(data => {
                if (data.attendance) {
                    setAttendance(data.attendance);
                }
                if (data.stats) {
                    setStats(data.stats);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch attendance", err);
                setLoading(false);
            });
    }, []);

    // Helper to check if a specific day has attendance
    const getDayStatus = (day: number) => {
        const record = attendance.find(a => new Date(a.checkIn).getDate() === day);
        if (record) return "present";

        const today = new Date().getDate();
        if (day < today) return "absent";
        return "future";
    };

    // Generate calendar days
    const generateCalendarDays = () => {
        const days = [];
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        for (let i = 1; i <= totalDays; i++) {
            days.push({
                date: i,
                isToday: i === today.getDate(),
                status: getDayStatus(i)
            });
        }
        return days;
    };

    const calendarDays = generateCalendarDays();

    if (loading) return <div className="p-8 text-center">Loading attendance...</div>;

    return (
        <div>
            {/* Stats */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "1rem",
                marginBottom: "2rem"
            }}>
                <div className="stat-card">
                    <p className="stat-value">{stats.daysPresent}</p>
                    <p className="stat-label">Days Present</p>
                </div>
                <div className="stat-card">
                    <p className="stat-value">{stats.totalHours}h</p>
                    <p className="stat-label">Total Hours</p>
                </div>
                <div className="stat-card">
                    <p className="stat-value">{stats.avgHoursPerDay}h</p>
                    <p className="stat-label">Avg/Day</p>
                </div>
                <div className="stat-card">
                    <p className="stat-value">{stats.streak} 🔥</p>
                    <p className="stat-label">Day Streak</p>
                </div>
            </div>

            {/* Calendar */}
            <div className="card">
                <h3 style={{ fontWeight: 600, marginBottom: "1.5rem" }}>{currentMonth}</h3>

                {/* Legend */}
                <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: "16px", height: "16px", borderRadius: "4px", background: "var(--success)" }}></div>
                        Present
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: "16px", height: "16px", borderRadius: "4px", background: "var(--error)" }}></div>
                        Absent
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{ width: "16px", height: "16px", borderRadius: "4px", background: "var(--surface-hover)", border: "1px solid var(--border)" }}></div>
                        Future
                    </span>
                </div>

                {/* Calendar Grid */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "0.5rem"
                }}>
                    {/* Week day headers */}
                    {weekDays.map(day => (
                        <div key={day} style={{
                            textAlign: "center",
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            padding: "0.5rem"
                        }}>
                            {day}
                        </div>
                    ))}

                    {/* Calendar days */}
                    {calendarDays.map((day, i) => (
                        <div key={i} style={{
                            aspectRatio: "1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.875rem",
                            fontWeight: day?.isToday ? 700 : 400,
                            background: day
                                ? day.status === "present" ? "var(--success)"
                                    : day.status === "absent" ? "var(--error)"
                                        : "var(--surface-hover)"
                                : "transparent",
                            color: day
                                ? day.status === "future" ? "var(--text-secondary)" : "white"
                                : "transparent",
                            border: day?.isToday ? "2px solid var(--foreground)" : "none"
                        }}>
                            {day?.date || ""}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
