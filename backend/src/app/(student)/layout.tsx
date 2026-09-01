"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

// Icons
const BookIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
);

const HomeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
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

const TicketIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
    </svg>
);

const CreditCardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
);

const ClockIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const LogOutIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const MenuIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);

const XIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const navItems = [
    { href: "/dashboard", icon: <HomeIcon />, label: "Dashboard" },
    { href: "/book", icon: <CalendarIcon />, label: "Book Seat" },
    { href: "/bookings", icon: <TicketIcon />, label: "My Bookings" },
    { href: "/payments", icon: <CreditCardIcon />, label: "Payments" },
    { href: "/attendance", icon: <ClockIcon />, label: "Attendance" },
    { href: "/profile", icon: <UserIcon />, label: "Profile" },
];

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    picture?: string;
}

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch current user on mount
    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await fetch("/api/auth/me");
                const data = await res.json();
                if (data.success && data.user) {
                    setUser(data.user);
                } else {
                    // Not logged in, redirect to login
                    router.push("/login");
                }
            } catch (error) {
                console.error("Error fetching user:", error);
                router.push("/login");
            } finally {
                setLoading(false);
            }
        }
        fetchUser();
    }, [router]);

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
        } catch (error) {
            console.error("Logout error:", error);
            router.push("/login");
        }
    };

    // Show loading state
    if (loading) {
        return (
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100vh",
                background: "var(--background)"
            }}>
                <p style={{ color: "var(--text-secondary)" }}>Loading...</p>
            </div>
        );
    }

    // Get user initials
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.5)",
                        zIndex: 40
                    }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={sidebarOpen ? "sidebar open" : "sidebar"}
                style={{
                    transform: sidebarOpen ? "translateX(0)" : undefined
                }}
            >
                {/* Logo */}
                <div style={{ marginBottom: "2rem" }}>
                    <Link href="/" style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        textDecoration: "none",
                        color: "var(--foreground)"
                    }}>
                        <div style={{
                            width: "36px",
                            height: "36px",
                            background: "var(--primary)",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white"
                        }}>
                            <BookIcon />
                        </div>
                        <span style={{ fontWeight: 700 }}>
                            Sameer <span style={{ color: "var(--primary)" }}>Library</span>
                        </span>
                    </Link>
                </div>

                {/* Nav Links */}
                <nav>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            {item.icon}
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Logout */}
                <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
                    <button
                        onClick={handleLogout}
                        className="sidebar-link"
                        style={{
                            color: "var(--error)",
                            width: "100%",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            textAlign: "left"
                        }}
                    >
                        <LogOutIcon />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-content" style={{ flex: 1 }}>
                {/* Top Bar */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "2rem"
                }}>
                    {/* Mobile Menu Button */}
                    <button
                        className="btn btn-ghost mobile-menu-btn"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{ display: "none" }}
                    >
                        {sidebarOpen ? <XIcon /> : <MenuIcon />}
                    </button>

                    <div>
                        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
                            {navItems.find(item => item.href === pathname)?.label || "Dashboard"}
                        </h1>
                    </div>

                    {/* User Info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ textAlign: "right" }}>
                            <p style={{ fontWeight: 500, fontSize: "0.875rem" }}>{user?.name || "User"}</p>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Student</p>
                        </div>
                        {user?.picture ? (
                            <img
                                src={user.picture}
                                alt={user.name}
                                style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "50%",
                                    objectFit: "cover"
                                }}
                            />
                        ) : (
                            <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                background: "var(--primary)",
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 600
                            }}>
                                {user ? getInitials(user.name) : "?"}
                            </div>
                        )}
                    </div>
                </div>

                {/* Page Content */}
                {children}
            </div>

            {/* Responsive Styles */}
            <style jsx>{`
        @media (max-width: 1024px) {
          .sidebar {
            transform: translateX(-100%);
            z-index: 50;
            transition: transform 0.3s ease;
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .main-content {
            margin-left: 0 !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>
        </div>
    );
}
