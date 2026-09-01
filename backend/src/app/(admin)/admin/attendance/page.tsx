"use client";

import { useState, useEffect } from "react";

export default function AttendanceAdminPage() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/admin/attendance?date=${selectedDate}`)
            .then(res => res.json())
            .then(data => {
                if (data.attendance) setAttendanceLogs(data.attendance);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch attendance", err);
                setLoading(false);
            });
    }, [selectedDate]);

    // Calculate stats from logs
    const totalCheckins = attendanceLogs.length;
    // Basic calculation for total duration in minutes
    const totalDurationMins = attendanceLogs.reduce((acc, log) => {
        if (!log.duration || log.duration === '-') return acc;
        const mins = parseInt(log.duration.split(' ')[0]);
        return acc + (isNaN(mins) ? 0 : mins);
    }, 0);
    const totalHours = (totalDurationMins / 60).toFixed(1);
    const avgDuration = totalCheckins > 0 ? (totalDurationMins / 60 / totalCheckins).toFixed(1) : "0";

    return (
        <div>
            {/* Date Picker & Stats */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                flexWrap: "wrap",
                gap: "1rem"
            }}>
                <input
                    type="date"
                    className="input"
                    style={{ maxWidth: "200px" }}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
                <div style={{ display: "flex", gap: "1rem" }}>
                    <div className="stat-card" style={{ padding: "1rem" }}>
                        <p className="stat-value" style={{ fontSize: "1.5rem" }}>{totalCheckins}</p>
                        <p className="stat-label">Total Check-ins</p>
                    </div>
                    <div className="stat-card" style={{ padding: "1rem" }}>
                        <p className="stat-value" style={{ fontSize: "1.5rem" }}>{totalHours}h</p>
                        <p className="stat-label">Total Hours</p>
                    </div>
                    <div className="stat-card" style={{ padding: "1rem" }}>
                        <p className="stat-value" style={{ fontSize: "1.5rem" }}>{avgDuration}h</p>
                        <p className="stat-label">Avg/Entry</p>
                    </div>
                </div>
            </div>

            {/* Attendance Table */}
            <div className="card" style={{ overflow: "auto" }}>
                {loading ? (
                    <div className="p-8 text-center">Loading logs...</div>
                ) : attendanceLogs.length === 0 ? (
                    <div className="p-8 text-center text-muted">No attendance records for this date.</div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Branch</th>
                                <th>Check-in</th>
                                <th>Check-out</th>
                                <th>Duration</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendanceLogs.map(log => (
                                <tr key={log.id}>
                                    <td style={{ fontWeight: 500 }}>
                                        {log.studentName}
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>{log.studentEmail}</div>
                                    </td>
                                    <td>
                                        <span className="badge badge-neutral">
                                            {log.branch}
                                        </span>
                                    </td>
                                    <td>{log.checkIn}</td>
                                    <td>
                                        {log.checkOut !== "-" ? (
                                            log.checkOut
                                        ) : (
                                            <span className="badge badge-success">Still Inside</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className="badge badge-info">{log.duration}</span>
                                    </td>
                                    <td>
                                        <span className={`badge ${log.status === "Active" ? "badge-success" : "badge-neutral"}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                * Filtered by Check-in Date
            </div>
        </div>
    );
}
