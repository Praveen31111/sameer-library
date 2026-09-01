"use client";

// Icons
const PlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const FingerprintIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12C2 6.48 6.48 2 12 2c1.85 0 3.58.5 5.06 1.37" />
        <path d="M12 11a1 1 0 0 1 1 1v4a1 1 0 0 1-2 0v-4a1 1 0 0 1 1-1z" />
        <path d="M17.7 17.7A8.94 8.94 0 0 0 21 12" />
        <path d="M12 6c-3.31 0-6 2.69-6 6 0 1.79.78 3.4 2.02 4.5" />
        <path d="M18 12a6 6 0 0 0-6-6" />
    </svg>
);

// Mock data
const devices = [
    { id: "1", name: "Main Entrance Scanner", identifier: "FP001", branch: "Sameer Library - Aliganj", lastSync: "2 min ago", status: "online", studentsEnrolled: 45 },
    { id: "2", name: "Exit Scanner", identifier: "FP002", branch: "Sameer Library - Aliganj", lastSync: "1 min ago", status: "online", studentsEnrolled: 45 },
    { id: "3", name: "Main Entrance Scanner", identifier: "FP003", branch: "Sameer Library - Gomti Nagar", lastSync: "5 min ago", status: "online", studentsEnrolled: 32 },
    { id: "4", name: "Backup Scanner", identifier: "FP004", branch: "Sameer Library - Aliganj", lastSync: "2 hours ago", status: "offline", studentsEnrolled: 0 },
];

export default function DevicesPage() {
    const handleAddDevice = () => {
        alert("Add new device dialog would open here");
    };

    return (
        <div>
            {/* Header */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem"
            }}>
                <div>
                    <p style={{ color: "var(--text-muted)" }}>
                        Manage fingerprint scanners for attendance tracking
                    </p>
                </div>
                <button className="btn btn-primary" onClick={handleAddDevice}>
                    <PlusIcon />
                    Add Device
                </button>
            </div>

            {/* Stats */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem"
            }}>
                <div className="stat-card">
                    <p className="stat-value" style={{ color: "var(--success)" }}>3</p>
                    <p className="stat-label">Online</p>
                </div>
                <div className="stat-card">
                    <p className="stat-value" style={{ color: "var(--error)" }}>1</p>
                    <p className="stat-label">Offline</p>
                </div>
                <div className="stat-card">
                    <p className="stat-value">4</p>
                    <p className="stat-label">Total Devices</p>
                </div>
                <div className="stat-card">
                    <p className="stat-value">122</p>
                    <p className="stat-label">Enrolled Students</p>
                </div>
            </div>

            {/* Devices Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1rem"
            }}>
                {devices.map(device => (
                    <div key={device.id} className="card">
                        <div style={{ display: "flex", gap: "1rem" }}>
                            <div style={{
                                width: "56px",
                                height: "56px",
                                borderRadius: "var(--radius-sm)",
                                background: device.status === "online" ? "rgba(34, 197, 94, 0.1)" : "var(--surface-hover)",
                                color: device.status === "online" ? "var(--success)" : "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                <FingerprintIcon />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <h3 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{device.name}</h3>
                                    <span className={`badge ${device.status === "online" ? "badge-success" : "badge-error"}`}>
                                        {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                                    </span>
                                </div>
                                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                                    ID: {device.identifier}
                                </p>
                                <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                                    📍 {device.branch}
                                </p>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                    <span>Last sync: {device.lastSync}</span>
                                    <span>{device.studentsEnrolled} enrolled</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                            <button className="btn btn-sm btn-secondary" style={{ flex: 1 }}>View Logs</button>
                            <button className="btn btn-sm btn-ghost" style={{ color: "var(--error)" }}>Remove</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
