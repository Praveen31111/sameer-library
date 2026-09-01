"use client";

import { useState, useEffect, useRef } from "react";

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

const CameraIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
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
    code: string;
    address: string;
    city: string;
    photo: string | null;
    isActive: boolean;
    roomCount: number;
    totalSeats: number;
}

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        address: "",
        city: "",
        photo: ""
    });
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch branches
    const fetchBranches = async () => {
        try {
            const res = await fetch("/api/admin/branches");
            const data = await res.json();
            if (data.branches) setBranches(data.branches);
        } catch (err) {
            console.error("Error fetching branches:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const openAddModal = () => {
        setEditingBranch(null);
        setFormData({ name: "", code: "", address: "", city: "", photo: "" });
        setShowModal(true);
    };

    const openEditModal = (branch: Branch) => {
        setEditingBranch(branch);
        setFormData({
            name: branch.name,
            code: branch.code,
            address: branch.address,
            city: branch.city,
            photo: branch.photo || ""
        });
        setShowModal(true);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Image size should be less than 5MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setFormData(prev => ({ ...prev, photo: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (editingBranch) {
                // Update
                const res = await fetch("/api/admin/branches", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: editingBranch.id, ...formData })
                });
                if (res.ok) {
                    setShowModal(false);
                    fetchBranches();
                } else {
                    const data = await res.json();
                    alert(data.error || "Update failed");
                }
            } else {
                // Create
                const res = await fetch("/api/admin/branches", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData)
                });
                if (res.ok) {
                    setShowModal(false);
                    fetchBranches();
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

    const handleDelete = async (branch: Branch) => {
        if (!confirm(`Are you sure you want to delete "${branch.name}"? This will also delete all rooms and seats.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/branches?id=${branch.id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                fetchBranches();
            } else {
                const data = await res.json();
                alert(data.error || "Delete failed");
            }
        } catch (err) {
            alert("Delete failed");
        }
    };

    const handleToggleActive = async (branch: Branch) => {
        try {
            await fetch("/api/admin/branches", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: branch.id, isActive: !branch.isActive })
            });
            fetchBranches();
        } catch (err) {
            alert("Update failed");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading branches...</div>;

    return (
        <div>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                    <p style={{ color: "var(--text-muted)" }}>
                        Manage your library branches, locations, and settings
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openAddModal}>
                    <PlusIcon />
                    Add Branch
                </button>
            </div>

            {/* Branches Grid */}
            {branches.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                    <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>No branches yet</p>
                    <button className="btn btn-primary" onClick={openAddModal}>
                        <PlusIcon /> Create Your First Branch
                    </button>
                </div>
            ) : (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: "1.5rem"
                }}>
                    {branches.map(branch => (
                        <div key={branch.id} className="card" style={{ overflow: "hidden", padding: 0 }}>
                            {/* Photo */}
                            <div style={{
                                height: "140px",
                                background: branch.photo
                                    ? `url(${branch.photo}) center/cover`
                                    : "linear-gradient(135deg, var(--primary) 0%, rgba(13, 148, 136, 0.7) 100%)",
                                display: "flex",
                                alignItems: "flex-end",
                                padding: "1rem"
                            }}>
                                <div style={{
                                    background: branch.isActive ? "var(--success)" : "var(--text-muted)",
                                    color: "white",
                                    padding: "0.25rem 0.75rem",
                                    borderRadius: "20px",
                                    fontSize: "0.75rem",
                                    fontWeight: 500
                                }}>
                                    {branch.isActive ? "Active" : "Inactive"}
                                </div>
                            </div>

                            {/* Content */}
                            <div style={{ padding: "1.25rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem" }}>
                                    <div>
                                        <h3 style={{ fontWeight: 600, fontSize: "1.1rem" }}>{branch.name}</h3>
                                        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Code: {branch.code}</p>
                                    </div>
                                </div>

                                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
                                    {branch.address || "No address"}{branch.city ? `, ${branch.city}` : ""}
                                </p>

                                {/* Stats */}
                                <div style={{
                                    display: "flex",
                                    gap: "1.5rem",
                                    padding: "0.75rem 0",
                                    borderTop: "1px solid var(--border)",
                                    borderBottom: "1px solid var(--border)",
                                    marginBottom: "1rem"
                                }}>
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: "1.25rem" }}>{branch.roomCount}</p>
                                        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Rooms</p>
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: "1.25rem" }}>{branch.totalSeats}</p>
                                        <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Seats</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        style={{ flex: 1 }}
                                        onClick={() => openEditModal(branch)}
                                    >
                                        <EditIcon /> Edit
                                    </button>
                                    <button
                                        className="btn btn-sm"
                                        style={{
                                            background: branch.isActive ? "rgba(245, 158, 11, 0.1)" : "rgba(34, 197, 94, 0.1)",
                                            color: branch.isActive ? "var(--warning)" : "var(--success)"
                                        }}
                                        onClick={() => handleToggleActive(branch)}
                                    >
                                        {branch.isActive ? "Deactivate" : "Activate"}
                                    </button>
                                    <button
                                        className="btn btn-sm"
                                        style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--error)" }}
                                        onClick={() => handleDelete(branch)}
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
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
                    <div className="card" style={{
                        width: "100%",
                        maxWidth: "480px",
                        maxHeight: "90vh",
                        overflow: "auto"
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "1.5rem"
                        }}>
                            <h2 style={{ fontWeight: 600, fontSize: "1.25rem" }}>
                                {editingBranch ? "Edit Branch" : "Add New Branch"}
                            </h2>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setShowModal(false)}
                            >
                                <XIcon />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Photo Preview */}
                            <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
                                <div
                                    style={{
                                        width: "100%",
                                        height: "120px",
                                        borderRadius: "var(--radius-sm)",
                                        background: formData.photo
                                            ? `url(${formData.photo}) center/cover`
                                            : "var(--surface-hover)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginBottom: "0.75rem",
                                        border: "2px dashed var(--border)"
                                    }}
                                >
                                    {!formData.photo && (
                                        <span style={{ color: "var(--text-muted)" }}>
                                            <CameraIcon />
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: "none" }}
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                />
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <CameraIcon /> {formData.photo ? "Change Photo" : "Upload Photo"}
                                </button>
                            </div>

                            {/* Form Fields */}
                            <div style={{ display: "grid", gap: "1rem" }}>
                                <div>
                                    <label className="label">Branch Name *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g., Sameer Library - Main Branch"
                                        value={formData.name}
                                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="label">Branch Code *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g., SL01"
                                        value={formData.code}
                                        onChange={e => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        required
                                        disabled={!!editingBranch}
                                        style={{ opacity: editingBranch ? 0.6 : 1 }}
                                    />
                                    {editingBranch && (
                                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                                            Code cannot be changed
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="label">Address</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Full address"
                                        value={formData.address}
                                        onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="label">City</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="City name"
                                        value={formData.city}
                                        onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : editingBranch ? "Save Changes" : "Create Branch"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
