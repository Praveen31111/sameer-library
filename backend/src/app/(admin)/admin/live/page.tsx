"use client";

import { useState, useEffect } from "react";

export default function LiveViewPage() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [seatMap, setSeatMap] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ total: 0, occupied: 0, available: 0, blocked: 0 });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const res = await fetch("/api/admin/live");
            const data = await res.json();
            if (data.seats) {
                setSeatMap(data.seats);
                setStats(data.stats);

                // Group seats by room
                const roomGroups = data.seats.reduce((acc: any, seat: any) => {
                    if (!acc[seat.roomName]) {
                        acc[seat.roomName] = { name: seat.roomName, seats: [], occupied: 0, total: 0 };
                    }
                    acc[seat.roomName].seats.push(seat);
                    acc[seat.roomName].total++;
                    if (seat.status === 'occupied') acc[seat.roomName].occupied++;
                    return acc;
                }, {});
                setRooms(Object.values(roomGroups));
            }
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch live data", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const currentlyInside = seatMap.filter(s => s.status === 'occupied').map(s => ({
        id: s.id,
        name: s.occupant?.name || "Unknown",
        seat: s.seatNumber,
        room: s.roomName,
        checkIn: s.occupant?.checkInTime // Currently mock in API
    }));

    if (loading) return <div className="p-8 text-center">Loading live view...</div>;

    return (
        <div>
            {/* Live Stats */}
            <div style={{
                background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                borderRadius: "var(--radius-lg)",
                padding: "2rem",
                color: "white",
                marginBottom: "2rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem"
            }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <span style={{
                            width: "12px",
                            height: "12px",
                            background: "#22c55e",
                            borderRadius: "50%",
                            animation: "pulse 2s infinite"
                        }}></span>
                        <span style={{ fontSize: "0.875rem", opacity: 0.9 }}>LIVE</span>
                    </div>
                    <h2 style={{ fontSize: "3rem", fontWeight: 700 }}>{stats.occupied}</h2>
                    <p style={{ opacity: 0.9 }}>Students Currently Inside</p>
                </div>
                <div style={{ textAlign: "right" }}>
                    <p style={{ opacity: 0.9, marginBottom: "0.5rem" }}>Total Capacity</p>
                    <p style={{ fontSize: "2rem", fontWeight: 600 }}>{stats.occupied} / {stats.total}</p>
                    <p style={{ opacity: 0.9 }}>{stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0}% Occupied</p>
                </div>
            </div>

            {/* Room Heatmaps */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                gap: "1.5rem",
                marginBottom: "2rem"
            }}>
                {rooms.map((room: any) => (
                    <div key={room.name} className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                            <h3 style={{ fontWeight: 600 }}>{room.name}</h3>
                            <span className={`badge ${room.occupied / room.total > 0.9 ? "badge-error" : room.occupied / room.total > 0.7 ? "badge-warning" : "badge-success"}`}>
                                {room.occupied}/{room.total} Occupied
                            </span>
                        </div>

                        {/* Seat Grid */}
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: `repeat(auto-fill, minmax(30px, 1fr))`,
                            gap: "0.5rem"
                        }}>
                            {room.seats.map((seat: any) => (
                                <div
                                    key={seat.id}
                                    title={`Seat ${seat.seatNumber} - ${seat.status}`}
                                    style={{
                                        aspectRatio: "1",
                                        borderRadius: "6px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.7rem",
                                        fontWeight: 600,
                                        background: seat.status === "occupied" ? "var(--primary)" : seat.status === "available" ? "rgba(34, 197, 94, 0.2)" : "var(--surface-hover)",
                                        color: seat.status === "occupied" ? "white" : seat.status === "available" ? "var(--success)" : "var(--text-muted)",
                                        border: seat.status === "available" ? "1px solid var(--success)" : "none",
                                        cursor: "help"
                                    }}
                                >
                                    {seat.seatNumber}
                                </div>
                            ))}
                        </div>

                        {/* Legend */}
                        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", fontSize: "0.75rem" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "var(--primary)" }}></div>
                                Occupied
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "rgba(34, 197, 94, 0.2)", border: "1px solid var(--success)" }}></div>
                                Available
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Currently Inside Table */}
            <div className="card">
                <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Currently Inside</h3>
                <div style={{ overflow: "auto" }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Seat/Room</th>
                                <th>Check-in</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentlyInside.length === 0 ? (
                                <tr><td colSpan={3} className="text-center text-muted">No one inside currently.</td></tr>
                            ) : currentlyInside.map(student => (
                                <tr key={student.id}>
                                    <td style={{ fontWeight: 500 }}>{student.name}</td>
                                    <td>
                                        <span style={{
                                            display: "inline-block",
                                            padding: "0.25rem 0.5rem",
                                            background: "var(--primary)",
                                            color: "white",
                                            borderRadius: "4px",
                                            fontSize: "0.75rem",
                                            fontWeight: 600
                                        }}>
                                            {student.seat}
                                        </span>
                                        <span className="text-xs text-muted ml-2">{student.room}</span>
                                    </td>
                                    <td>{student.checkIn}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
