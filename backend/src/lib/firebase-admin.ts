import * as admin from "firebase-admin";

try {
    if (!admin.apps.length) {
        // Validate env vars first
        if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
            console.error("FIREBASE ADMIN ERROR: Missing environment variables.");
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }),
        });
        console.log("Firebase Admin Initialized successfully.");
    }
} catch (error) {
    console.error("FIREBASE ADMIN INIT FAILED:", error);
}

export const adminAuth = admin.auth();
