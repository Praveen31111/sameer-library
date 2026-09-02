import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1a1a1a', lineHeight: '1.6' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#00685b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: 'bold', fontSize: '20px' }}>
          📖
        </div>
        <h1 style={{ fontSize: '28px', color: '#00685b', margin: 0 }}>Sameer Library - Privacy Policy</h1>
      </div>

      <p style={{ color: '#666', fontSize: '14px' }}>Effective Date: September 2, 2026 | Last Updated: September 2, 2026</p>

      <section style={{ marginTop: '28px' }}>
        <h2 style={{ fontSize: '20px', color: '#00685b' }}>1. Introduction</h2>
        <p>Welcome to <strong>Sameer Library</strong>. We respect your privacy and are committed to protecting your personal information. This Privacy Policy outlines how our mobile application and web services collect, use, and protect your information when you reserve seats, manage library memberships, and interact with our services.</p>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '20px', color: '#00685b' }}>2. Information We Collect</h2>
        <ul>
          <li><strong>Personal Details:</strong> Full Name, Email Address, and Mobile Phone Number provided during account registration.</li>
          <li><strong>Booking Information:</strong> Seat number, branch, study room, booking duration, and membership dates.</li>
          <li><strong>Payment Information:</strong> Records of payment transaction IDs and status (processed securely; no raw debit/credit card numbers are stored).</li>
          <li><strong>Attendance Records:</strong> Timestamped library check-in and check-out records.</li>
        </ul>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '20px', color: '#00685b' }}>3. How We Use Your Information</h2>
        <ul>
          <li>To allocate and manage your reserved study seats and library spaces.</li>
          <li>To authenticate and secure student and administrator accounts.</li>
          <li>To send booking confirmation notifications and important library updates.</li>
          <li>To prevent duplicate bookings and ensure fair seat distribution.</li>
        </ul>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '20px', color: '#00685b' }}>4. Data Protection & Security</h2>
        <p>We use industry-standard encryption, tokenized authentication (JWT), and secure cloud databases (Neon PostgreSQL & Google Firebase) to safeguard your personal data from unauthorized access, disclosure, or alteration.</p>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '20px', color: '#00685b' }}>5. Third-Party Services</h2>
        <p>We only use trusted service providers for core functionality:</p>
        <ul>
          <li><strong>Google Sign-In / Firebase:</strong> For optional one-tap sign-in authentication.</li>
          <li><strong>Hosting & Database:</strong> Vercel and Neon Cloud for reliable cloud computing and storage.</li>
        </ul>
        <p>We do NOT sell, rent, or trade your personal data with any third-party advertisers.</p>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '20px', color: '#00685b' }}>6. Account Deletion & Rights</h2>
        <p>Users have the right to review, update, or request deletion of their account and personal data at any time by contacting library support at <strong>sameer7518@gmail.com</strong>.</p>
      </section>

      <section style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '20px', color: '#00685b' }}>7. Contact Information</h2>
        <p>If you have any questions or concerns regarding this Privacy Policy, please reach out to:</p>
        <p>
          <strong>Sameer Library Administration</strong><br />
          Email: <a href="mailto:sameer7518@gmail.com" style={{ color: '#00685b' }}>sameer7518@gmail.com</a><br />
          Location: Maharajganj, Uttar Pradesh, India
        </p>
      </section>

      <footer style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e0e0e0', fontSize: '13px', color: '#888', textAlign: 'center' }}>
        &copy; {new Date().getFullYear()} Sameer Library. All rights reserved.
      </footer>
    </div>
  );
}
