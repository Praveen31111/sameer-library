"use client";

import { useState, useEffect } from "react";

// Icons
const PlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

const XIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

interface Branch {
    id: string;
    name: string;
    rooms: Room[];
}

interface Room {
    id: string;
    name: string;
    branchName: string;
    branchId: string;
    seatCount: number;
    capacity: number;
}

interface Seat {
    id: string;
    seatNumber: string;
    status: string;
}

export default function SeatsPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [seats, setSeats] = useState<Seat[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [roomFormData, setRoomFormData] = useState({ name: "", branchId: "", capacity: 20 });
    const [saving, setSaving] = useState(false);

    // Fetch branches and rooms
    const fetchData = async () => {
        try {
            const res = await fetch("/api/branches");
            const data = await res.json();
            if (data.branches) {
                setBranches(data.branches);
                const allRooms = data.branches.reduce((acc: Room[], branch: any) => {
                    return [...acc, ...branch.rooms.map((r: any) => ({
                        ...r,
                        branchName: branch.name,
                        branchId: branch.id
                    }))];
                }, []);
                setRooms(allRooms);
                if (allRooms.length > 0 && !selectedRoomId) {
                    setSelectedRoomId(allRooms[0].id);
                }
            }
            setLoading(false);
        } catch (err) {
            console.error("Error fetching data:", err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Fetch seats when room selected
    useEffect(() => {
        if (!selectedRoomId) return;

        fetch(`/api/rooms/${selectedRoomId}/seats`)
            .then(res => res.json())
            .then(data => {
                if (data.seats) setSeats(data.seats);
            })
            .catch(err => console.error(err));
    }, [selectedRoomId]);

    const currentRoom = rooms.find(r => r.id === selectedRoomId);

    // Room handlers
    const openAddRoomModal = () => {
        setEditingRoom(null);
        setRoomFormData({
            name: "",
            branchId: branches.length > 0 ? branches[0].id : "",
            capacity: 20
        });
        setShowRoomModal(true);
    };

    const openEditRoomModal = (room: Room) => {
        setEditingRoom(room);
        setRoomFormData({
            name: room.name,
            branchId: room.branchId,
            capacity: room.capacity
        });
        setShowRoomModal(true);
    };

    const handleRoomSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (editingRoom) {
                // Update room
                const res = await fetch("/api/admin/rooms", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: editingRoom.id,
                        name: roomFormData.name,
                        capacity: roomFormData.capacity
                    })
                });
                if (res.ok) {
                    setShowRoomModal(false);
                    fetchData();
                } else {
                    const data = await res.json();
                    alert(data.error || "Update failed");
                }
            } else {
                // Create room
                const res = await fetch("/api/admin/rooms", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(roomFormData)
                });
                if (res.ok) {
                    setShowRoomModal(false);
                    fetchData();
                } else {
                    const data = await res.json();
                    alert(data.error || "Create failed");
                }
            }
        } catch (err) {
            alert("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRoom = async (room: Room) => {
        if (!confirm(`Delete "${room.name}" and all its seats? This cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/admin/rooms?id=${room.id}`, { method: "DELETE" });
            if (res.ok) {
                if (selectedRoomId === room.id) {
                    setSelectedRoomId(rooms.find(r => r.id !== room.id)?.id || null);
                }
                fetchData();
            } else {
                const data = await res.json();
                alert(data.error || "Delete failed");
            }
        } catch (err) {
            alert("Delete failed");
        }
    };

    // Seat handlers
    const handleToggleSeat = async (seat: Seat) => {
        if (seat.status === "booked") {
            alert("Cannot modify booked seat");
            return;
        }

        const action = seat.status === "blocked" ? "UNBLOCK" : "BLOCK";

        try {
            const res = await fetch(`/api/rooms/${selectedRoomId}/seats`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ seatId: seat.id, action })
            });
            if (res.ok) {
                setSeats(seats.map(s =>
                    s.id === seat.id
                        ? { ...s, status: action === "BLOCK" ? "blocked" : "available" }
                        : s
                ));
            }
        } catch (error) {
            alert("Failed to update seat");
        }
    };

    const handleDeleteSeat = async (seat: Seat) => {
        if (seat.status === "booked") {
            alert("Cannot delete booked seat");
            return;
        }
        if (!confirm(`Delete seat ${seat.seatNumber}?`)) return;

        try {
            const res = await fetch(`/api/rooms/${selectedRoomId}/seats`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ seatId: seat.id, action: "DELETE" })
            });
            if (res.ok) {
                setSeats(seats.filter(s => s.id !== seat.id));
            }
        } catch (error) {
            alert("Failed to delete seat");
        }
    };

    const handleAddSeat = async () => {
        try {
            const res = await fetch(`/api/rooms/${selectedRoomId}/seats`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ count: 1 })
            });
            if (res.ok) {
                const refreshRes = await fetch(`/api/rooms/${selectedRoomId}/seats`);
                const data = await refreshRes.json();
                if (data.seats) setSeats(data.seats);
            }
        } catch (error) {
            alert("Failed to add seat");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading rooms...</div>;

    const availableCount = seats.filter(s => s.status === 'available').length;

    return (
        <div>
            {/* Header with Add Room button */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <p style={{ color: "var(--text-muted)" }}>Manage rooms and seats across all branches</p>
                <button className="btn btn-primary" onClick={openAddRoomModal}>
                    <PlusIcon /> Add Room
                </button>
            </div>

            {/* Room Tabs */}
            {rooms.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                    <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>No rooms yet</p>
                    <button className="btn btn-primary" onClick={openAddRoomModal}>
                        <PlusIcon /> Create Your First Room
                    </button>
                </div>
            ) : (
                <>
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                        {rooms.map(room => (
                            <button
                                key={room.id}
                                onClick={() => setSelectedRoomId(room.id)}
                                className={`btn ${selectedRoomId === room.id ? "btn-primary" : "btn-secondary"}`}
                            >
                                {room.name}
                                <span style={{ marginLeft: "0.5rem", opacity: 0.8, fontSize: "0.8em" }}>
                                    ({room.seatCount || 0})
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Room Info */}
                    {currentRoom && (
                        <>
                            <div className="card" style={{ marginBottom: "1.5rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>{currentRoom.name}</h2>
                                        <p style={{ color: "var(--text-muted)" }}>
                                            {currentRoom.branchName} • {seats.length} total • {availableCount} available
                                        </p>
                                    </div>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => openEditRoomModal(currentRoom)}>
                                            <EditIcon /> Rename
                                        </button>
                                        <button className="btn btn-secondary btn-sm" onClick={handleAddSeat}>
                                            <PlusIcon /> Add Seat
                                        </button>
                                        <button
                                            className="btn btn-sm"
                                            style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--error)" }}
                                            onClick={() => handleDeleteRoom(currentRoom)}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Seat Grid */}
                            <div className="card">
                                <h3 style={{ fontWeight: 600, marginBottom: "1rem" }}>Seats</h3>

                                {/* Legend */}
                                <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", fontSize: "0.875rem", flexWrap: "wrap" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: "rgba(34, 197, 94, 0.2)", border: "2px solid var(--success)" }}></div>
                                        Available
                                    </span>
                                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: "var(--primary)" }}></div>
                                        Booked
                                    </span>
                                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <div style={{ width: "20px", height: "20px", borderRadius: "4px", background: "var(--surface-hover)", border: "2px dashed var(--border-dark)" }}></div>
                                        Blocked
                                    </span>
                                </div>

                                {seats.length === 0 ? (
                                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                                        No seats yet. Click "Add Seat" to add seats.
                                    </div>
                                ) : (
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "1rem" }}>
                                        {seats.map(seat => (
                                            <div
                                                key={seat.id}
                                                style={{
                                                    padding: "0.75rem",
                                                    borderRadius: "var(--radius-sm)",
                                                    background: seat.status === "booked" ? "var(--primary)" : seat.status === "blocked" ? "var(--surface-hover)" : "rgba(34, 197, 94, 0.1)",
                                                    border: seat.status === "available" ? "2px solid var(--success)" : seat.status === "blocked" ? "2px dashed var(--border-dark)" : "none",
                                                    color: seat.status === "booked" ? "white" : seat.status === "available" ? "var(--success)" : "var(--text-muted)",
                                                    textAlign: "center"
                                                }}
                                            >
                                                <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>{seat.seatNumber}</p>
                                                <p style={{ fontSize: "0.7rem", marginBottom: "0.5rem" }}>
                                                    {seat.status.charAt(0).toUpperCase() + seat.status.slice(1)}
                                                </p>
                                                {seat.status !== 'booked' && (
                                                    <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center" }}>
                                                        <button
                                                            className="btn btn-sm"
                                                            style={{ fontSize: "0.6rem", padding: "0.2rem 0.4rem", background: "var(--surface)", color: "var(--text-secondary)" }}
                                                            onClick={() => handleToggleSeat(seat)}
                                                        >
                                                            {seat.status === "blocked" ? "Unblock" : "Block"}
                                                        </button>
                                                        <button
                                                            className="btn btn-sm"
                                                            style={{ fontSize: "0.6rem", padding: "0.2rem 0.4rem", background: "rgba(239, 68, 68, 0.1)", color: "var(--error)" }}
                                                            onClick={() => handleDeleteSeat(seat)}
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}

            {/* Room Modal */}
            {showRoomModal && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 100,
                    padding: "1rem"
                }}>
                    <div className="card" style={{ width: "100%", maxWidth: "400px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h2 style={{ fontWeight: 600, fontSize: "1.25rem" }}>
                                {editingRoom ? "Edit Room" : "Add New Room"}
                            </h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowRoomModal(false)}>
                                <XIcon />
                            </button>
                        </div>

                        <form onSubmit={handleRoomSubmit}>
                            <div style={{ display: "grid", gap: "1rem" }}>
                                {!editingRoom && (
                                    <div>
                                        <label className="label">Branch *</label>
                                        <select
                                            className="input"
                                            value={roomFormData.branchId}
                                            onChange={e => setRoomFormData(prev => ({ ...prev, branchId: e.target.value }))}
                                            required
                                        >
                                            {branches.map(branch => (
                                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="label">Room Name *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g., Silent Zone, General Reading"
                                        value={roomFormData.name}
                                        onChange={e => setRoomFormData(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="label">Capacity</label>
                                    <input
                                        type="number"
                                        className="input"
                                        min="1"
                                        value={roomFormData.capacity}
                                        onChange={e => setRoomFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 20 }))}
                                    />
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowRoomModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                                    {saving ? "Saving..." : editingRoom ? "Save Changes" : "Create Room"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
