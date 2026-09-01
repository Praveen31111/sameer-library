"use client";

import { useState, useEffect, useRef } from "react";

// Icons
const CameraIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    </svg>
);

export default function ProfilePage() {
    const [profile, setProfile] = useState({
        name: "",
        email: "",
        phone: "",
        college: "",
        course: "",
        profilePhoto: ""
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch("/api/auth/me")
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    setProfile({
                        name: data.user.name || "",
                        email: data.user.email || "",
                        phone: data.user.phone || "",
                        college: data.user.college || "",
                        course: data.user.course || "",
                        profilePhoto: data.user.picture || data.user.profilePhoto || ""
                    });
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch profile", err);
                setLoading(false);
            });
    }, []);

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            alert("Please select an image file");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("Image size should be less than 5MB");
            return;
        }

        setUploadingPhoto(true);

        try {
            // Convert to base64 for simple upload
            const reader = new FileReader();
            reader.onload = async () => {
                const base64 = reader.result as string;

                // Upload to API
                const res = await fetch("/api/profile/photo", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ photo: base64 })
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    setProfile(prev => ({ ...prev, profilePhoto: data.photoUrl || base64 }));
                    alert("Photo updated successfully!");
                } else {
                    throw new Error(data.error || "Upload failed");
                }

                setUploadingPhoto(false);
            };

            reader.onerror = () => {
                alert("Failed to read file");
                setUploadingPhoto(false);
            };

            reader.readAsDataURL(file);
        } catch (error: unknown) {
            console.error("Photo upload error:", error);
            alert(error instanceof Error ? error.message : "Failed to upload photo");
            setUploadingPhoto(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profile)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Update failed");

            alert("Profile updated successfully!");
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : "Update failed");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading profile...</div>;

    return (
        <div style={{ maxWidth: "600px" }}>
            {/* Avatar */}
            <div style={{ marginBottom: "2rem", textAlign: "center" }}>
                {profile.profilePhoto ? (
                    <img
                        src={profile.profilePhoto}
                        alt={profile.name}
                        style={{
                            width: "120px",
                            height: "120px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            margin: "0 auto 1rem",
                            display: "block"
                        }}
                    />
                ) : (
                    <div style={{
                        width: "120px",
                        height: "120px",
                        borderRadius: "50%",
                        background: "var(--primary)",
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "3rem",
                        fontWeight: 700,
                        margin: "0 auto 1rem"
                    }}>
                        {profile.name.charAt(0).toUpperCase()}
                    </div>
                )}

                {/* Hidden file input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept="image/*"
                    onChange={handlePhotoChange}
                />

                <button
                    className="btn btn-secondary btn-sm"
                    onClick={handlePhotoClick}
                    disabled={uploadingPhoto}
                >
                    <CameraIcon />
                    {uploadingPhoto ? "Uploading..." : "Change Photo"}
                </button>
            </div>

            {/* Form */}
            <div className="card">
                <div style={{ display: "grid", gap: "1.5rem" }}>
                    <div>
                        <label className="label">Full Name</label>
                        <input
                            type="text"
                            className="input"
                            value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label">Email</label>
                        <input
                            type="email"
                            className="input"
                            value={profile.email}
                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        />
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                            ✓ Verified
                        </p>
                    </div>

                    <div>
                        <label className="label">Phone</label>
                        <input
                            type="tel"
                            className="input"
                            value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        />
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                            ✓ Verified
                        </p>
                    </div>

                    <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

                    <div>
                        <label className="label">College / University</label>
                        <input
                            type="text"
                            className="input"
                            value={profile.college}
                            onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label">Course / Field of Study</label>
                        <input
                            type="text"
                            className="input"
                            value={profile.course}
                            onChange={(e) => setProfile({ ...profile, course: e.target.value })}
                        />
                    </div>

                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

