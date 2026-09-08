"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LibraryPassPrintPage() {
    const params = useParams();
    const router = useRouter();
    const bookingId = params?.id as string;

    const [passData, setPassData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!bookingId) return;
        fetch(`/api/admin/pass?bookingId=${bookingId}`)
            .then(res => res.json())
            .then(data => {
                if (data.pass) setPassData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load pass", err);
                setLoading(false);
            });
    }, [bookingId]);

    if (loading) return <div style={{ padding: "3rem", textAlign: "center" }}>Generating Library Pass...</div>;
    if (!passData) return <div style={{ padding: "3rem", textAlign: "center" }}>Pass not found.</div>;

    const { pass, student, seat } = passData;

    return (
        <div style={{ padding: "2rem 1rem", maxWidth: "600px", margin: "0 auto" }}>
            {/* Top Action Bar (hidden on print) */}
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                <button className="btn btn-secondary" onClick={() => router.back()}>
                    ← Back
                </button>
                <button className="btn btn-primary" onClick={() => window.print()}>
                    🖨️ Print ID Pass (PVC / Paper)
                </button>
            </div>

            {/* PRINTABLE PASS CARD (Styled for standard vertical ID badge: 350px x 520px) */}
            <div id="library-pass-card" style={{
                backgroundColor: "#ffffff",
                color: "#0f172a",
                borderRadius: "16px",
                overflow: "hidden",
                border: "2px solid #0284c7",
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                width: "100%",
                maxWidth: "380px",
                margin: "0 auto",
                fontFamily: "system-ui, -apple-system, sans-serif"
            }}>
                {/* Header Badge */}
                <div style={{
                    background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                    color: "#ffffff",
                    padding: "1.25rem 1rem",
                    textAlign: "center"
                }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>🏛️</div>
                    <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, letterSpacing: "0.5px" }}>
                        SAMEER DIGITAL LIBRARY
                    </h2>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", opacity: 0.9 }}>
                        {seat.branchName} • {seat.branchCode}
                    </p>
                    <span style={{
                        display: "inline-block",
                        marginTop: "0.5rem",
                        backgroundColor: "#f59e0b",
                        color: "#000",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "12px",
                        letterSpacing: "0.5px"
                    }}>
                        OFFICIAL STUDENT ACCESS PASS
                    </span>
                </div>

                {/* Body Content */}
                <div style={{ padding: "1.25rem", textAlign: "center" }}>
                    {/* Student Photo */}
                    <div style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        margin: "0 auto 0.75rem auto",
                        overflow: "hidden",
                        border: "3px solid #0284c7",
                        backgroundColor: "#f1f5f9"
                    }}>
                        <img
                            src={student.profilePhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80"}
                            alt={student.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                    </div>

                    <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                        {student.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b" }}>
                        ID: <b style={{ color: "#0f172a" }}>{pass.passNumber}</b>
                    </p>

                    {/* Seat & Shift Highlight */}
                    <div style={{
                        backgroundColor: "#f8fafc",
                        border: "1px dashed #cbd5e1",
                        borderRadius: "8px",
                        padding: "0.5rem 1rem",
                        margin: "1rem 0",
                        display: "flex",
                        justifyContent: "space-around"
                    }}>
                        <div>
                            <div style={{ fontSize: "0.6875rem", color: "#64748b" }}>ASSIGNED SEAT</div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0284c7" }}>
                                Seat {seat.seatNumber}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: "0.6875rem", color: "#64748b" }}>SHIFT / PLAN</div>
                            <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a" }}>
                                {seat.planType}
                            </div>
                        </div>
                    </div>

                    {/* QR Code */}
                    <div style={{ margin: "1rem auto", width: "160px", height: "160px" }}>
                        <img
                            src={pass.qrCodeDataUrl}
                            alt="Attendance QR Code"
                            style={{ width: "100%", height: "100%", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                        />
                    </div>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
                        Scan at Library Entry for Geofenced Attendance
                    </p>

                    {/* Barcode Section */}
                    <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #e2e8f0" }}>
                        <div style={{
                            fontFamily: "monospace",
                            letterSpacing: "4px",
                            fontSize: "1.2rem",
                            fontWeight: 700,
                            color: "#1e293b"
                        }}>
                            ||||| | |||| || |||||| | |||
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", fontFamily: "monospace" }}>
                            {pass.barcodeData}
                        </div>
                    </div>
                </div>

                {/* Card Footer */}
                <div style={{
                    backgroundColor: "#f1f5f9",
                    padding: "0.5rem",
                    textAlign: "center",
                    borderTop: "1px solid #e2e8f0",
                    fontSize: "0.6875rem",
                    color: "#64748b"
                }}>
                    Valid Until: <b>{new Date(pass.validUntil).toLocaleDateString("en-IN")}</b> • Property of Sameer Library
                </div>
            </div>

            {/* Print Styling */}
            <style jsx global>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    body {
                        background: #ffffff !important;
                        padding: 0 !important;
                    }
                    #library-pass-card {
                        box-shadow: none !important;
                        border: 1px solid #000 !important;
                        margin: 20px auto !important;
                    }
                }
            `}</style>
        </div>
    );
}
