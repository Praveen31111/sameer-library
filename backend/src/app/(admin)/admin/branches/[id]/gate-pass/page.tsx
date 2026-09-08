"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface GatePassData {
    branch: {
        id: string;
        name: string;
        code: string;
        address: string;
        city: string;
        latitude?: number;
        longitude?: number;
        geofenceRadiusMeters?: number;
        gatePassUpdatedAt?: string;
    };
    qrToken: string;
    qrCodeUrl: string;
}

export default function BranchGatePassPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const branchId = resolvedParams.id;

    const [data, setData] = useState<GatePassData | null>(null);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const loadGatePass = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/branches/gate-pass?branchId=${branchId}`);
            const result = await res.json();
            if (result.success) {
                setData(result);
            } else {
                setFeedback({ type: "error", text: result.error || "Failed to load gate pass" });
            }
        } catch (err) {
            console.error("Error loading gate pass:", err);
            setFeedback({ type: "error", text: "Network error while loading gate pass" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGatePass();
    }, [branchId]);

    // Admin Rotates / Regenerates Gate QR Token
    const handleRegenerate = async () => {
        const confirmed = window.confirm(
            "Kripya dhyan dein:\n\nNaya QR Code generate karte hi gate par laga purana QR code turant EXPIRE (aman-ya) ho jayega. Koi bhi student purane QR se attendance mark nahi kar payega.\n\nKya aap sach me naya QR Code generate karna chahte hain?"
        );
        if (!confirmed) return;

        setRegenerating(true);
        setFeedback(null);
        try {
            const res = await fetch("/api/admin/branches/gate-pass", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ branchId }),
            });
            const result = await res.json();
            if (result.success) {
                setData(prev => prev ? {
                    ...prev,
                    qrToken: result.qrToken,
                    qrCodeUrl: result.qrCodeUrl,
                    branch: {
                        ...prev.branch,
                        gatePassUpdatedAt: result.branch.gatePassUpdatedAt
                    }
                } : null);
                setFeedback({
                    type: "success",
                    text: "Naya QR Code safalta-purvak generate ho gaya hai! Purana QR expire kar diya gaya hai."
                });
            } else {
                setFeedback({ type: "error", text: result.error || "Regeneration failed" });
            }
        } catch (err) {
            setFeedback({ type: "error", text: "Failed to regenerate QR code" });
        } finally {
            setRegenerating(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                Loading Gate Attendance Pass...
            </div>
        );
    }

    if (!data) {
        return (
            <div style={{ padding: "3rem", textAlign: "center" }}>
                <p style={{ color: "#ef4444" }}>Gate pass could not be loaded.</p>
                <Link href="/admin/branches" className="btn btn-secondary" style={{ marginTop: "1rem" }}>
                    ← Back to Branches
                </Link>
            </div>
        );
    }

    const { branch, qrCodeUrl } = data;

    return (
        <div style={{ padding: "1.5rem", maxWidth: "900px", margin: "0 auto" }}>
            {/* SCREEN-ONLY TOOLBAR */}
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                    <Link href="/admin/branches" style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.875rem" }}>
                        ← Back to Branches
                    </Link>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.5rem 0 0.25rem 0" }}>
                        Entrance Gate Attendance Pass
                    </h1>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
                        {branch.name} ({branch.code}) • Gate Poster for Student Check-in / Check-out
                    </p>
                </div>

                <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="btn btn-secondary"
                        style={{
                            borderColor: "var(--warning)",
                            color: "var(--warning)",
                            fontSize: "0.875rem"
                        }}
                    >
                        {regenerating ? "Generating..." : "🔄 Regenerate QR (Expire Old)"}
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="btn btn-primary"
                        style={{ fontSize: "0.875rem" }}
                    >
                        🖨️ Print Gate Poster
                    </button>
                </div>
            </div>

            {/* FEEDBACK ALERT */}
            {feedback && (
                <div className="no-print" style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    marginBottom: "1.5rem",
                    backgroundColor: feedback.type === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    border: `1px solid ${feedback.type === "success" ? "#22c55e" : "#ef4444"}`,
                    color: feedback.type === "success" ? "#4ade80" : "#f87171",
                    display: "flex",
                    justifyContent: "space-between"
                }}>
                    <span>{feedback.text}</span>
                    <button onClick={() => setFeedback(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
                </div>
            )}

            {/* ADMIN NOTICE */}
            <div className="no-print" style={{
                backgroundColor: "rgba(2, 132, 199, 0.1)",
                border: "1px solid rgba(2, 132, 199, 0.3)",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "2rem",
                fontSize: "0.875rem",
                color: "var(--text-secondary)"
            }}>
                <div style={{ fontWeight: 600, color: "#38bdf8", marginBottom: "0.25rem" }}>
                    💡 Admin Control & Security Info:
                </div>
                <div>
                    • Yeh <b>single gate QR code</b> library ke main gate ya reception par stick karein.<br />
                    • Har approved student Sameer Library Mobile App se isko scan karke <b>Punch IN / Punch OUT</b> karega.<br />
                    • Agar kisi student ne photo le li ya cheat karne ki koshish ki, to aap kabhi bhi upar diye gaye <b>"Regenerate QR"</b> button se naya QR code generate kar sakte hain. Purana wala turant reject ho jayega!
                </div>
            </div>

            {/* PRINTABLE GATE POSTER CONTAINER */}
            <div className="gate-poster-container" style={{
                backgroundColor: "#ffffff",
                color: "#0f172a",
                borderRadius: "16px",
                padding: "3rem 2rem",
                textAlign: "center",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                border: "2px solid #e2e8f0",
                maxWidth: "600px",
                margin: "0 auto",
            }}>
                {/* Poster Header */}
                <div style={{ marginBottom: "1.5rem" }}>
                    <div style={{
                        display: "inline-block",
                        backgroundColor: "#0284c7",
                        color: "white",
                        padding: "0.4rem 1.25rem",
                        borderRadius: "50px",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        marginBottom: "0.75rem"
                    }}>
                        SAMEER LIBRARY • ENTRANCE GATE PASS
                    </div>
                    <h2 style={{ fontSize: "2rem", fontWeight: 800, margin: "0.25rem 0", color: "#0f172a" }}>
                        {branch.name}
                    </h2>
                    <p style={{ color: "#64748b", fontSize: "0.9375rem", margin: 0 }}>
                        {branch.address}{branch.city ? `, ${branch.city}` : ""}
                    </p>
                </div>

                {/* Big QR Code Display */}
                <div style={{
                    backgroundColor: "#f8fafc",
                    border: "3px dashed #cbd5e1",
                    borderRadius: "16px",
                    padding: "1.5rem",
                    display: "inline-block",
                    margin: "0.5rem auto 1.5rem auto"
                }}>
                    <img
                        src={qrCodeUrl}
                        alt="Gate Attendance QR Code"
                        style={{ width: "320px", height: "320px", display: "block" }}
                    />
                    <div style={{ marginTop: "0.5rem", fontSize: "0.8125rem", fontWeight: 700, color: "#0284c7" }}>
                        GATE CODE: {branch.code}
                    </div>
                </div>

                {/* Student Instructions Box */}
                <div style={{
                    backgroundColor: "#f1f5f9",
                    padding: "1.25rem",
                    borderRadius: "12px",
                    textAlign: "left",
                    maxWidth: "460px",
                    margin: "0 auto 1.5rem auto"
                }}>
                    <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.9375rem", marginBottom: "0.5rem" }}>
                        📱 Attendance Kaise Mark Karein:
                    </div>
                    <ol style={{ margin: 0, paddingLeft: "1.25rem", color: "#475569", fontSize: "0.875rem", lineHeight: "1.6" }}>
                        <li>Sameer Library Mobile App kholein.</li>
                        <li><b>"Scan Gate QR"</b> par tap karein aur phone camera is QR code par point karein.</li>
                        <li>Aapka <b>Punch IN (Ya Punch OUT)</b> turant confirm ho jayega!</li>
                    </ol>
                </div>

                {/* Security Footer */}
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1rem", color: "#94a3b8", fontSize: "0.75rem" }}>
                    <p style={{ margin: "0 0 0.25rem 0" }}>
                        🔒 <b>Geofence Verified</b> • Attendance is only accepted within {branch.geofenceRadiusMeters || 75}m of the library premises.
                    </p>
                    <p style={{ margin: 0 }}>
                        Pass Version Updated: {branch.gatePassUpdatedAt ? new Date(branch.gatePassUpdatedAt).toLocaleString("en-IN") : "Active"}
                    </p>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .gate-poster-container {
                        box-shadow: none !important;
                        border: 2px solid #000 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 2rem 1rem !important;
                        margin: 0 !important;
                        page-break-inside: avoid;
                    }
                }
            `}</style>
        </div>
    );
}
