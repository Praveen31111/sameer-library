"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    });

    const handleChange = (e: any) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    const handleGoogleSignup = async () => {
        if (isGoogleLoading) return;
        setIsGoogleLoading(true);
        setError("");
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const token = await result.user.getIdToken();
            const res = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
            });
            const data = await res.json();
            if (data.success) {
                window.location.href = "/dashboard";
            } else {
                setError(data.error || "Signup failed");
                setIsGoogleLoading(false);
            }
        } catch (err: unknown) {
            if (err instanceof Error && !err.message?.includes("cancelled-popup-request")) {
                setError("Google signup failed");
            }
            setIsGoogleLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Registration failed");
            }

            router.push("/dashboard");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--background)",
            padding: "1.5rem"
        }}>
            <div style={{ width: "100%", maxWidth: "400px" }}>
                {/* Logo */}
                <Link href="/" style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.75rem",
                    textDecoration: "none",
                    color: "var(--foreground)",
                    marginBottom: "2.5rem"
                }}>
                    <div style={{
                        width: "44px",
                        height: "44px",
                        background: "linear-gradient(135deg, var(--primary) 0%, #0a9488 100%)",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 12px rgba(13, 148, 136, 0.3)"
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: "1.4rem", letterSpacing: "-0.02em" }}>
                        Sameer <span style={{ color: "var(--primary)" }}>Library</span>
                    </span>
                </Link>

                {/* Card */}
                <div style={{
                    background: "var(--surface)",
                    borderRadius: "16px",
                    padding: "2rem",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)",
                    border: "1px solid var(--border)"
                }}>
                    <h1 style={{
                        fontSize: "1.5rem",
                        fontWeight: 600,
                        marginBottom: "0.25rem",
                        textAlign: "center",
                        letterSpacing: "-0.01em"
                    }}>
                        Create account
                    </h1>
                    <p style={{
                        color: "var(--text-muted)",
                        textAlign: "center",
                        marginBottom: "1.75rem",
                        fontSize: "0.9rem"
                    }}>
                        Join our study community
                    </p>

                    {/* Google Signup */}
                    <button
                        onClick={handleGoogleSignup}
                        disabled={isGoogleLoading}
                        style={{
                            width: "100%",
                            padding: "0.85rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.75rem",
                            background: "var(--foreground)",
                            color: "var(--background)",
                            border: "none",
                            borderRadius: "10px",
                            fontWeight: 500,
                            fontSize: "0.9rem",
                            cursor: isGoogleLoading ? "wait" : "pointer",
                            opacity: isGoogleLoading ? 0.7 : 1,
                            transition: "all 0.2s ease",
                            marginBottom: "1.5rem"
                        }}
                    >
                        {isGoogleLoading ? (
                            "Creating account..."
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </button>

                    {/* Divider */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        marginBottom: "1.5rem"
                    }}>
                        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>or</span>
                        <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                    </div>

                    {error && (
                        <div style={{
                            marginBottom: "1rem",
                            padding: "0.75rem 1rem",
                            borderRadius: "10px",
                            background: "rgba(239, 68, 68, 0.08)",
                            color: "#dc2626",
                            fontSize: "0.85rem",
                            textAlign: "center"
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Progress */}
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                        <div style={{
                            flex: 1,
                            height: "3px",
                            borderRadius: "2px",
                            background: step >= 1 ? "var(--primary)" : "var(--border)"
                        }} />
                        <div style={{
                            flex: 1,
                            height: "3px",
                            borderRadius: "2px",
                            background: step >= 2 ? "var(--primary)" : "var(--border)"
                        }} />
                    </div>

                    <form onSubmit={handleSubmit}>
                        {step === 1 && (
                            <div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{
                                        display: "block",
                                        marginBottom: "0.5rem",
                                        fontSize: "0.85rem",
                                        fontWeight: 500,
                                        color: "var(--text-secondary)"
                                    }}>
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "0.8rem 1rem",
                                            border: "1px solid var(--border)",
                                            borderRadius: "10px",
                                            background: "var(--background)",
                                            fontSize: "0.9rem",
                                            outline: "none"
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{
                                        display: "block",
                                        marginBottom: "0.5rem",
                                        fontSize: "0.85rem",
                                        fontWeight: 500,
                                        color: "var(--text-secondary)"
                                    }}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="john@example.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "0.8rem 1rem",
                                            border: "1px solid var(--border)",
                                            borderRadius: "10px",
                                            background: "var(--background)",
                                            fontSize: "0.9rem",
                                            outline: "none"
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: "1.5rem" }}>
                                    <label style={{
                                        display: "block",
                                        marginBottom: "0.5rem",
                                        fontSize: "0.85rem",
                                        fontWeight: 500,
                                        color: "var(--text-secondary)"
                                    }}>
                                        Phone
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        placeholder="+91 99999 99999"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "0.8rem 1rem",
                                            border: "1px solid var(--border)",
                                            borderRadius: "10px",
                                            background: "var(--background)",
                                            fontSize: "0.9rem",
                                            outline: "none"
                                        }}
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    style={{
                                        width: "100%",
                                        padding: "0.85rem",
                                        background: "var(--primary)",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "10px",
                                        fontWeight: 500,
                                        fontSize: "0.9rem",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease"
                                    }}
                                >
                                    Continue
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{
                                        display: "block",
                                        marginBottom: "0.5rem",
                                        fontSize: "0.85rem",
                                        fontWeight: 500,
                                        color: "var(--text-secondary)"
                                    }}>
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="Create password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        disabled={isLoading}
                                        style={{
                                            width: "100%",
                                            padding: "0.8rem 1rem",
                                            border: "1px solid var(--border)",
                                            borderRadius: "10px",
                                            background: "var(--background)",
                                            fontSize: "0.9rem",
                                            outline: "none"
                                        }}
                                    />
                                </div>

                                <div style={{ marginBottom: "1.5rem" }}>
                                    <label style={{
                                        display: "block",
                                        marginBottom: "0.5rem",
                                        fontSize: "0.85rem",
                                        fontWeight: 500,
                                        color: "var(--text-secondary)"
                                    }}>
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        placeholder="Repeat password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        disabled={isLoading}
                                        style={{
                                            width: "100%",
                                            padding: "0.8rem 1rem",
                                            border: "1px solid var(--border)",
                                            borderRadius: "10px",
                                            background: "var(--background)",
                                            fontSize: "0.9rem",
                                            outline: "none"
                                        }}
                                    />
                                </div>

                                <div style={{ display: "flex", gap: "0.75rem" }}>
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        disabled={isLoading}
                                        style={{
                                            flex: 1,
                                            padding: "0.85rem",
                                            background: "var(--surface-hover)",
                                            color: "var(--foreground)",
                                            border: "none",
                                            borderRadius: "10px",
                                            fontWeight: 500,
                                            fontSize: "0.9rem",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        style={{
                                            flex: 2,
                                            padding: "0.85rem",
                                            background: "var(--primary)",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "10px",
                                            fontWeight: 500,
                                            fontSize: "0.9rem",
                                            cursor: isLoading ? "wait" : "pointer",
                                            opacity: isLoading ? 0.7 : 1
                                        }}
                                    >
                                        {isLoading ? "Creating..." : "Create Account"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <p style={{
                    textAlign: "center",
                    marginTop: "1.5rem",
                    fontSize: "0.875rem",
                    color: "var(--text-muted)"
                }}>
                    Already have an account?{" "}
                    <Link href="/login" style={{
                        color: "var(--primary)",
                        textDecoration: "none",
                        fontWeight: 500
                    }}>
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
