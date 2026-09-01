"use client";

import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

// Icons as simple SVG components
const BookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const CreditCardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const FingerprintIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12C2 6.48 6.48 2 12 2c1.85 0 3.58.5 5.06 1.37" />
    <path d="M12 11a1 1 0 0 1 1 1v4a1 1 0 0 1-2 0v-4a1 1 0 0 1 1-1z" />
    <path d="M17.7 17.7A8.94 8.94 0 0 0 21 12" />
    <path d="M12 6c-3.31 0-6 2.69-6 6 0 1.79.78 3.4 2.02 4.5" />
    <path d="M18 12a6 6 0 0 0-6-6" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 2v20" />
    <path d="M18 2v20" />
    <path d="M6 2h12" />
    <path d="M6 12h12" />
    <path d="M6 22h12" />
    <rect x="10" y="6" width="4" height="4" />
    <rect x="10" y="14" width="4" height="4" />
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

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const features = [
  {
    icon: <CalendarIcon />,
    title: "Easy Seat Booking",
    description: "Select your preferred branch, room, and seat. Book daily, weekly, or monthly plans with just a few clicks."
  },
  {
    icon: <CreditCardIcon />,
    title: "Secure Online Payment",
    description: "Pay securely via Razorpay. Get instant confirmation and digital invoices for all your transactions."
  },
  {
    icon: <FingerprintIcon />,
    title: "Fingerprint Attendance",
    description: "Quick check-in and check-out with fingerprint scanners. Track your study hours automatically."
  },
  {
    icon: <BuildingIcon />,
    title: "Multi-Branch Access",
    description: "Access any of our branches with a single account. Switch locations as per your convenience."
  }
];

const stats = [
  { value: "2+", label: "Branches" },
  { value: "100+", label: "Seats" },
  { value: "500+", label: "Happy Students" },
  { value: "24/7", label: "Study Access" }
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Navbar */}
      <nav style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "70px",
        background: "rgba(var(--surface-rgb, 255, 255, 255), 0.9)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--border)",
        zIndex: 100,
        display: "flex",
        alignItems: "center"
      }}>
        <div className="container" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          {/* Logo */}
          <Link href="/" style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
            color: "var(--foreground)"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              background: "var(--primary)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white"
            }}>
              <BookIcon />
            </div>
            <span style={{ fontWeight: 700, fontSize: "1.25rem" }}>
              Sameer <span style={{ color: "var(--primary)" }}>Library</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "2rem"
          }} className="desktop-nav">
            <Link href="#features" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Features</Link>
            <Link href="#about" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>About</Link>
            <Link href="#contact" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Contact</Link>
          </div>

          {/* Auth Buttons & Theme Toggle */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }} className="desktop-nav">
            <ThemeToggle />
            <Link href="/login" className="btn btn-ghost">Login</Link>
            <Link href="/register" className="btn btn-primary">Sign Up</Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn btn btn-ghost"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: "none" }}
          >
            {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div style={{
          position: "fixed",
          top: "70px",
          left: 0,
          right: 0,
          bottom: 0,
          background: "var(--surface)",
          zIndex: 99,
          padding: "2rem"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <Link href="#features" style={{ fontSize: "1.25rem", color: "var(--foreground)", textDecoration: "none" }}>Features</Link>
            <Link href="#about" style={{ fontSize: "1.25rem", color: "var(--foreground)", textDecoration: "none" }}>About</Link>
            <Link href="#contact" style={{ fontSize: "1.25rem", color: "var(--foreground)", textDecoration: "none" }}>Contact</Link>
            <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Theme:</span>
              <ThemeToggle />
            </div>
            <Link href="/login" className="btn btn-secondary" style={{ justifyContent: "center" }}>Login</Link>
            <Link href="/register" className="btn btn-primary" style={{ justifyContent: "center" }}>Sign Up</Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section style={{
        paddingTop: "150px",
        paddingBottom: "100px",
        background: "linear-gradient(135deg, rgba(13, 148, 136, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)"
      }}>
        <div className="container">
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4rem",
            alignItems: "center"
          }} className="hero-grid">
            {/* Hero Text */}
            <div className="animate-fadeIn">
              <span className="badge badge-success" style={{ marginBottom: "1rem" }}>
                ✨ Now Open in Lucknow
              </span>
              <h1 style={{
                fontSize: "3.5rem",
                fontWeight: 800,
                lineHeight: 1.1,
                marginBottom: "1.5rem"
              }}>
                Your Perfect <br />
                <span style={{ color: "var(--primary)" }}>Study Space</span><br />
                Awaits
              </h1>
              <p style={{
                fontSize: "1.2rem",
                color: "var(--text-secondary)",
                marginBottom: "2rem",
                maxWidth: "500px"
              }}>
                Book your favorite seat at Sameer Library. Enjoy a peaceful study
                environment with modern amenities, secure access, and flexible plans.
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <Link href="/register" className="btn btn-primary btn-lg">
                  Book Your Seat
                  <ChevronRightIcon />
                </Link>
                <Link href="#features" className="btn btn-secondary btn-lg">
                  Learn More
                </Link>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="animate-fadeIn stagger-2" style={{ position: "relative" }}>
              <div style={{
                background: "var(--surface)",
                borderRadius: "var(--radius-lg)",
                padding: "2rem",
                boxShadow: "var(--shadow-lg)",
                border: "1px solid var(--border)"
              }}>
                {/* Booking Preview Card */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ fontWeight: 600 }}>Quick Book</h3>
                    <span className="badge badge-info">Available Now</span>
                  </div>
                  <div style={{ display: "grid", gap: "1rem" }}>
                    <div>
                      <label className="label">Branch</label>
                      <div className="input" style={{ background: "var(--surface-hover)" }}>
                        📍 Sameer Library - Mohanapur
                      </div>
                    </div>
                    <div>
                      <label className="label">Room</label>
                      <div className="input" style={{ background: "var(--surface-hover)" }}>
                        🤫 Silent Zone
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mini Seat Map */}
                <div>
                  <label className="label">Select Seat</label>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "0.5rem"
                  }}>
                    {["A1", "A2", "A3", "A4", "A5", "B1", "B2", "B3", "B4", "B5"].map((seat, i) => (
                      <div
                        key={seat}
                        className={`seat ${i === 2 ? "seat-selected" : i === 5 || i === 7 ? "seat-booked" : "seat-available"}`}
                      >
                        {seat}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <div style={{ width: "12px", height: "12px", borderRadius: "3px", border: "2px solid var(--success)" }}></div>
                      Available
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: "var(--primary)" }}></div>
                      Selected
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <div style={{ width: "12px", height: "12px", borderRadius: "3px", border: "2px solid var(--error)" }}></div>
                      Booked
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <div style={{
                position: "absolute",
                bottom: "-20px",
                right: "-20px",
                background: "var(--accent)",
                color: "white",
                padding: "1rem 1.5rem",
                borderRadius: "var(--radius)",
                fontWeight: 600,
                boxShadow: "var(--shadow-lg)"
              }}>
                From ₹50/day
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: "3rem 0", background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="container">
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "2rem",
            textAlign: "center"
          }} className="stats-grid">
            {stats.map((stat, i) => (
              <div key={i} className="animate-fadeIn" style={{ animationDelay: `${i * 0.1}s` }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--primary)" }}>{stat.value}</div>
                <div style={{ color: "var(--text-secondary)" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section" style={{ background: "var(--background)" }}>
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <span className="badge badge-info" style={{ marginBottom: "1rem" }}>Features</span>
            <h2 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem" }}>
              Everything You Need to <span style={{ color: "var(--primary)" }}>Study Smart</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "600px", margin: "0 auto" }}>
              We&apos;ve designed our library experience to be seamless, modern, and student-friendly.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "2rem"
          }} className="features-grid">
            {features.map((feature, i) => (
              <div
                key={i}
                className="card animate-fadeIn"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  display: "flex",
                  gap: "1.5rem"
                }}
              >
                <div style={{
                  width: "56px",
                  height: "56px",
                  background: "rgba(13, 148, 136, 0.1)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary)",
                  flexShrink: 0
                }}>
                  {feature.icon}
                </div>
                <div>
                  <h3 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{feature.title}</h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{
        padding: "5rem 0",
        background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)"
      }}>
        <div className="container" style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, color: "white", marginBottom: "1rem" }}>
            Ready to Start Studying?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: "2rem", maxWidth: "500px", margin: "0 auto 2rem" }}>
            Join hundreds of students who have already found their perfect study spot at Sameer Library.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="btn btn-lg" style={{ background: "white", color: "var(--primary)" }}>
              Create Free Account
            </Link>
            <Link href="/login" className="btn btn-lg" style={{ background: "transparent", color: "white", border: "2px solid white" }}>
              Login to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "3rem 0",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)"
      }}>
        <div className="container">
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{
                width: "32px",
                height: "32px",
                background: "var(--primary)",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white"
              }}>
                <BookIcon />
              </div>
              <span style={{ fontWeight: 600 }}>Sameer Library</span>
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              © 2024 Sameer Library. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Responsive Styles */}
      <style jsx>{`
        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .hero-grid > div:first-child {
            order: 1;
          }
          .hero-grid > div:last-child {
            order: 0;
          }
          .hero-grid h1 {
            font-size: 2.5rem !important;
          }
          .hero-grid p {
            margin-left: auto;
            margin-right: auto;
          }
          .features-grid {
            grid-template-columns: 1fr !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
          .hero-grid h1 {
            font-size: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}
