"use client";

import { useState, useEffect } from "react";

export default function StudentsPage() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete ${name}? This will remove all their bookings, payments, and attendance history permanently.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/students?id=${id}`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (res.ok) {
                setStudents(prev => prev.filter(s => s.id !== id));
                alert("Student deleted successfully");
            } else {
                alert(data.error || "Failed to delete student");
            }
        } catch (err) {
            console.error("Error deleting student:", err);
            alert("An error occurred. Please try again.");
        }
    };

    useEffect(() => {
        fetch("/api/admin/students")
            .then(res => res.json())
            .then(data => {
                if (data.students) setStudents(data.students);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch students", err);
                setLoading(false);
            });
    }, []);

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.email.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === "all" || s.status.toLowerCase() === filter;
        return matchesSearch && matchesFilter;
    });

    // Determine stats from data
    const totalStudents = students.length;
    const blockedStudents = students.filter(s => s.status === 'BLOCKED').length;
    // Note: Other stats would ideally come from the API payload or be calculated if data is available
    const activeBookingsCount = students.reduce((acc, s) => acc + (s.totalBookings > 0 ? 1 : 0), 0); // Rough approximation

    if (loading) return <div className="p-8 text-center">Loading students...</div>;

    return (
        <div>
            {/* Stats */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem"
            }}>
                <div className="stat-card">
                    <p className="stat-value">{totalStudents}</p>
                    <p className="stat-label">Total Students</p>
                </div>
                <div className="stat-card">
                    <p className="stat-value" style={{ color: "var(--success)" }}>{activeBookingsCount}</p>
                    <p className="stat-label">Active Bookers</p>
                </div>
                <div className="stat-card">
                    <p className="stat-value" style={{ color: "var(--info)" }}>-</p>
                    <p className="stat-label">New This Week</p>
                </div>
                <div className="stat-card">
                    <p className="stat-value" style={{ color: "var(--error)" }}>{blockedStudents}</p>
                    <p className="stat-label">Blocked</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div style={{
                display: "flex",
                gap: "1rem",
                marginBottom: "1.5rem",
                flexWrap: "wrap"
            }}>
                <input
                    type="search"
                    className="input"
                    placeholder="Search students..."
                    style={{ maxWidth: "300px" }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    {["all", "active", "blocked", "pending_verification"].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
                        >
                            {f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Students Table */}
            <div className="card" style={{ overflow: "auto" }}>
                {filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-muted">No students found.</div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Contact</th>
                                <th>College</th>
                                <th>Bookings</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map(student => (
                                <tr key={student.id}>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                            <div style={{
                                                width: "40px",
                                                height: "40px",
                                                borderRadius: "50%",
                                                background: student.status === "ACTIVE" ? "var(--primary)" : "var(--surface-hover)",
                                                color: student.status === "ACTIVE" ? "white" : "var(--text-muted)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontWeight: 600
                                            }}>
                                                {student.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: 500 }}>{student.name}</p>
                                                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                                    Joined {new Date(student.joinedDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <p style={{ fontSize: "0.875rem" }}>{student.email}</p>
                                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{student.phone}</p>
                                    </td>
                                    <td>{student.college || "-"}</td>
                                    <td>
                                        <span className="badge badge-neutral">{student.totalBookings}</span>
                                    </td>
                                    <td>
                                        <span className={`badge ${student.status === "ACTIVE" ? "badge-success" : student.status === "BLOCKED" ? "badge-error" : "badge-warning"}`}>
                                            {student.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: "0.5rem" }}>
                                            <button className="btn btn-sm btn-secondary">View</button>
                                            <button 
                                                className="btn btn-sm btn-error"
                                                onClick={() => handleDelete(student.id, student.name)}
                                            >
                                                Delete
                                            </button>
                                        </div>
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
