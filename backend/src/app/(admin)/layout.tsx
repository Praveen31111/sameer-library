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

const ActivityIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

const TicketIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
        <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
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

const UsersIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const ClockIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const CreditCardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
);

const FingerprintIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12C2 6.48 6.48 2 12 2c1.85 0 3.58.5 5.06 1.37" />
        <path d="M12 11a1 1 0 0 1 1 1v4a1 1 0 0 1-2 0v-4a1 1 0 0 1 1-1z" />
        <path d="M17.7 17.7A8.94 8.94 0 0 0 21 12" />
        <path d="M12 6c-3.31 0-6 2.69-6 6 0 1.79.78 3.4 2.02 4.5" />
        <path d="M18 12a6 6 0 0 0-6-6" />
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

const BuildingIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <path d="M9 22v-4h6v4" />
        <path d="M8 6h.01" /><path d="M16 6h.01" />
        <path d="M8 10h.01" /><path d="M16 10h.01" />
        <path d="M8 14h.01" /><path d="M16 14h.01" />
    </svg>
);

const navItems = [
    { href: "/admin", icon: <HomeIcon />, label: "Dashboard" },
    { href: "/admin/live", icon: <ActivityIcon />, label: "Live View" },
    { href: "/admin/bookings", icon: <TicketIcon />, label: "Bookings" },
    { href: "/admin/branches", icon: <BuildingIcon />, label: "Branches" },
    { href: "/admin/seats", icon: <GridIcon />, label: "Seats & Rooms" },
    { href: "/admin/students", icon: <UsersIcon />, label: "Students" },
    { href: "/admin/attendance", icon: <ClockIcon />, label: "Attendance" },
    { href: "/admin/payments", icon: <CreditCardIcon />, label: "Revenue" },
    { href: "/admin/devices", icon: <FingerprintIcon />, label: "Devices" },
];

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [branchName, setBranchName] = useState<string>("");

    // Authentication check
    useEffect(() => {
        async function checkAuth() {
            try {
                const res = await fetch("/api/auth/me");
                const data = await res.json();

                if (data.success && data.user) {
                    // Check if user is admin or owner
                    if (data.user.role !== "ADMIN" && data.user.role !== "OWNER") {
                        router.push("/login");
                        return;
                    }
                    setUser(data.user);

                    // Fetch first branch name
                    try {
                        const branchRes = await fetch("/api/branches");
                        const branchData = await branchRes.json();
                        if (branchData.branches && branchData.branches.length > 0) {
                            setBranchName(branchData.branches[0].name);
                        }
                    } catch (e) {
                        console.error("Failed to fetch branch", e);
                    }
                } else {
                    router.push("/login");
                }
            } catch (error) {
                console.error("Auth check error:", error);
                router.push("/login");
            } finally {
                setLoading(false);
            }
        }
        checkAuth();
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
                background: "#0f172a"
            }}>
                <p style={{ color: "#94a3b8" }}>Verifying admin access...</p>
            </div>
        );
    }

    // Get user initials
    const getInitials = (name: string) => {
        return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
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
                    transform: sidebarOpen ? "translateX(0)" : undefined,
                    background: "#0f172a" // Dark sidebar for admin
                }}
            >
                {/* Logo */}
                <div style={{ marginBottom: "2rem" }}>
                    <Link href="/" style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        textDecoration: "none",
                        color: "white"
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
                        <div>
                            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Sameer Library</span>
                            <span style={{ display: "block", fontSize: "0.7rem", color: "#94a3b8" }}>Admin Panel</span>
                        </div>
                    </Link>
                </div>

                {/* Nav Links */}
                <nav>
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                padding: "0.75rem 1rem",
                                borderRadius: "8px",
                                color: pathname === item.href ? "white" : "#94a3b8",
                                textDecoration: "none",
                                transition: "all 0.2s",
                                marginBottom: "0.25rem",
                                background: pathname === item.href ? "rgba(13, 148, 136, 0.2)" : "transparent"
                            }}
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
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            padding: "0.75rem 1rem",
                            borderRadius: "8px",
                            color: "#f87171",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            width: "100%",
                            textAlign: "left"
                        }}
                    >
                        <LogOutIcon />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="main-content" style={{ flex: 1, background: "var(--background)" }}>
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
                        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                            {branchName || "Admin Panel"}
                        </p>
                    </div>

                    {/* Admin Info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div style={{ textAlign: "right" }}>
                            <p style={{ fontWeight: 500, fontSize: "0.875rem" }}>{user?.name || "Admin"}</p>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                {user?.role === "OWNER" ? "Owner" : "Admin"}
                            </p>
                        </div>
                        <div style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            background: "#0f172a",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 600
                        }}>
                            {user ? getInitials(user.name) : "A"}
                        </div>
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
