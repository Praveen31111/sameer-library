"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Icons
const CheckIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const MapPinIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const DoorIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 3H6C4.9 3 4 3.9 4 5v14c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
        <path d="M14 12h.01" />
    </svg>
);

const GridIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
    </svg>
);

const CalendarIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const ClipboardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
);

const plans = [
    { id: "DAILY", name: "Daily", price: 50, description: "Single day access" },
    { id: "WEEKLY", name: "Weekly", price: 300, description: "7 days continuous access" },
    { id: "MONTHLY", name: "Monthly", price: 1000, description: "30 days unlimited access" },
];

const steps = [
    { id: 1, name: "Branch", icon: <MapPinIcon /> },
    { id: 2, name: "Room", icon: <DoorIcon /> },
    { id: 3, name: "Seat", icon: <GridIcon /> },
    { id: 4, name: "Dates", icon: <CalendarIcon /> },
    { id: 5, name: "Confirm", icon: <ClipboardIcon /> },
];

export default function BookingPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [branches, setBranches] = useState<any[]>([]);
    const [seats, setSeats] = useState<any[]>([]);
    const [loadingBranches, setLoadingBranches] = useState(true);
    const [loadingSeats, setLoadingSeats] = useState(false);

    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
    const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<string>("MONTHLY");
    const [startDate, setStartDate] = useState("");

    useEffect(() => {
        fetch("/api/branches")
            .then((res) => res.json())
            .then((data) => {
                if (data.branches) setBranches(data.branches);
                setLoadingBranches(false);
            })
            .catch((err) => {
                console.error("Failed to fetch branches", err);
                setLoadingBranches(false);
            });
    }, []);

    useEffect(() => {
        if (selectedRoom) {
            setLoadingSeats(true);
            fetch(`/api/rooms/${selectedRoom}/seats`)
                .then((res) => res.json())
                .then((data) => {
                    if (data.seats) setSeats(data.seats);
                    setLoadingSeats(false);
                })
                .catch((err) => {
                    console.error("Failed to fetch seats", err);
                    setLoadingSeats(false);
                });
        }
    }, [selectedRoom]);

    const handleNext = () => {
        if (canProceed()) setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async () => {
        try {
            const res = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    branchId: selectedBranch,
                    roomId: selectedRoom,
                    seatId: selectedSeat,
                    startDate,
                    endDate: new Date(new Date(startDate).setDate(new Date(startDate).getDate() + 30)).toISOString(), // Mock end date
                    planType: selectedPlan,
                    amount: plans.find(p => p.id === selectedPlan)?.price || 0
                })
            });

            if (res.ok) {
                window.location.href = "/bookings";
            } else {
                alert("Booking failed");
            }
        } catch (error) {
            console.error("Booking error:", error);
            alert("An error occurred");
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1: return !!selectedBranch;
            case 2: return !!selectedRoom;
            case 3: return !!selectedSeat;
            case 4: return !!startDate && !!selectedPlan;
            default: return false;
        }
    };

    const getSelectedBranch = () => branches.find(b => b.id === selectedBranch);
    const getSelectedRoom = () => getSelectedBranch()?.rooms?.find((r: any) => r.id === selectedRoom);
    const getSelectedPlan = () => plans.find(p => p.id === selectedPlan);

    return (
        <div style={{ paddingBottom: "6rem" }}>
            {/* Steps Indicator */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "2rem",
                position: "relative"
            }}>
                <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "0",
                    right: "0",
                    height: "2px",
                    background: "var(--surface-hover)",
                    zIndex: 0
                }}></div>
                {steps.map((step) => (
                    <div key={step.id} style={{
                        position: "relative",
                        zIndex: 1,
                        background: "var(--background)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem"
                    }}>
                        <div style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            background: step.id <= currentStep ? "var(--primary)" : "var(--surface-hover)",
                            color: step.id <= currentStep ? "white" : "var(--text-muted)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "var(--transition)"
                        }}>
                            {step.id < currentStep ? <CheckIcon /> : step.icon}
                        </div>
                        <span style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: step.id <= currentStep ? "var(--foreground)" : "var(--text-muted)"
                        }}>
                            {step.name}
                        </span>
                    </div>
                ))}
            </div>

            {/* Step 1: Select Branch */}
            {currentStep === 1 && (
                <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Select Branch</h2>
                    <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                        Choose a library branch near you
                    </p>
                    <div style={{ display: "grid", gap: "1rem" }}>
                        {branches.map(branch => (
                            <div
                                key={branch.id}
                                onClick={() => setSelectedBranch(branch.id)}
                                style={{
                                    padding: "1.5rem",
                                    border: `2px solid ${selectedBranch === branch.id ? "var(--primary)" : "var(--border)"}`,
                                    borderRadius: "var(--radius)",
                                    cursor: "pointer",
                                    background: selectedBranch === branch.id ? "rgba(13, 148, 136, 0.05)" : "var(--surface)",
                                    transition: "var(--transition)"
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <h3 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{branch.name}</h3>
                                        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                                            {branch.location}
                                        </p>
                                    </div>
                                    {selectedBranch === branch.id && (
                                        <div style={{
                                            width: "24px",
                                            height: "24px",
                                            borderRadius: "50%",
                                            background: "var(--primary)",
                                            color: "white",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}>
                                            <CheckIcon />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 2: Select Room */}
            {currentStep === 2 && (
                <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Select Room</h2>
                    <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                        Choose your preferred study environment
                    </p>
                    <div style={{ display: "grid", gap: "1rem" }}>
                        {getSelectedBranch()?.rooms ? getSelectedBranch().rooms.map((room: any) => (
                            <div
                                key={room.id}
                                onClick={() => setSelectedRoom(room.id)}
                                style={{
                                    padding: "1.5rem",
                                    border: `2px solid ${selectedRoom === room.id ? "var(--primary)" : "var(--border)"}`,
                                    borderRadius: "var(--radius)",
                                    cursor: "pointer",
                                    background: selectedRoom === room.id ? "rgba(13, 148, 136, 0.05)" : "var(--surface)",
                                    transition: "var(--transition)"
                                }}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                        <h3 style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{room.name}</h3>
                                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.875rem" }}>
                                            <span className="badge badge-neutral">{room.capacity} Total Seats</span>
                                        </div>
                                    </div>
                                    {selectedRoom === room.id && (
                                        <div style={{
                                            width: "24px",
                                            height: "24px",
                                            borderRadius: "50%",
                                            background: "var(--primary)",
                                            color: "white",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}>
                                            <CheckIcon />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )) : <p>Loading rooms...</p>}
                    </div>
                </div>
            )}

            {/* Step 3: Select Seat */}
            {currentStep === 3 && (
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Select Your Seat</h2>
                        {loadingSeats && <span className="text-sm text-muted">Loading seats...</span>}
                    </div>
                    <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                        Click on an available seat to select it
                    </p>

                    {/* Legend */}
                    <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                            <div className="seat seat-available" style={{ width: "24px", height: "24px", fontSize: "0.5rem" }}></div>
                            Available
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                            <div className="seat seat-selected" style={{ width: "24px", height: "24px", fontSize: "0.5rem" }}></div>
                            Selected
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                            <div className="seat seat-booked" style={{ width: "24px", height: "24px", fontSize: "0.5rem" }}></div>
                            Booked
                        </span>
                    </div>

                    {/* Seat Grid */}
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(6, 1fr)",
                        gap: "0.75rem",
                        maxWidth: "400px"
                    }}>
                        {seats.map(seat => (
                            <div
                                key={seat.id}
                                className={`seat ${selectedSeat === seat.id ? "seat-selected" :
                                    seat.status === "available" ? "seat-available" : "seat-booked"
                                    }`}
                                onClick={() => seat.status === "available" && setSelectedSeat(seat.id)}
                            >
                                {seat.seatNumber}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 4: Dates */}
            {currentStep === 4 && (
                <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Select Dates & Plan</h2>
                    <div style={{ display: "grid", gap: "1.5rem", maxWidth: "500px" }}>
                        <div>
                            <label className="label">Start Date</label>
                            <input
                                type="date"
                                className="input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                min={new Date().toISOString().split("T")[0]}
                            />
                        </div>
                        <div>
                            <label className="label">Select Plan</label>
                            <div style={{ display: "grid", gap: "0.75rem" }}>
                                {plans.map(plan => (
                                    <div
                                        key={plan.id}
                                        onClick={() => setSelectedPlan(plan.id)}
                                        style={{
                                            padding: "1rem",
                                            border: `2px solid ${selectedPlan === plan.id ? "var(--primary)" : "var(--border)"}`,
                                            borderRadius: "var(--radius-sm)",
                                            cursor: "pointer",
                                            background: selectedPlan === plan.id ? "rgba(13, 148, 136, 0.05)" : "var(--surface)"
                                        }}
                                    >
                                        <p style={{ fontWeight: 600 }}>{plan.name}</p>
                                        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{plan.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 5: Confirm */}
            {currentStep === 5 && (
                <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Confirm Booking</h2>
                    <div style={{
                        background: "var(--surface-hover)",
                        borderRadius: "var(--radius)",
                        padding: "1.5rem",
                        marginBottom: "1.5rem"
                    }}>
                        <div style={{ display: "grid", gap: "1rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-secondary)" }}>Branch</span>
                                <span style={{ fontWeight: 500 }}>{getSelectedBranch()?.name}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-secondary)" }}>Room</span>
                                <span style={{ fontWeight: 500 }}>{getSelectedRoom()?.name}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-secondary)" }}>Seat</span>
                                <span style={{ fontWeight: 500 }}>{seats.find(s => s.id === selectedSeat)?.seatNumber}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-secondary)" }}>Total Amount</span>
                                <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--primary)" }}>
                                    ₹{getSelectedPlan()?.price}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginTop: "2rem" }}>
                <button
                    className="btn btn-secondary"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    style={{ opacity: currentStep === 1 ? 0.5 : 1 }}
                >
                    ← Back
                </button>

                {currentStep < 5 ? (
                    <button
                        className="btn btn-primary"
                        onClick={handleNext}
                        disabled={!canProceed()}
                        style={{ opacity: canProceed() ? 1 : 0.5 }}
                    >
                        Continue →
                    </button>
                ) : (
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                    >
                        Submit Booking Request
                    </button>
                )}
            </div>
        </div>
    );
}
