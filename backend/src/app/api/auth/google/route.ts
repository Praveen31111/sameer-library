import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateToken, setAuthCookie } from "@/lib/auth";
import { adminAuth } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token } = body;

        if (!token) {
            console.log("Google Auth API: Missing token");
            return NextResponse.json({ error: "Missing token" }, { status: 400 });
        }

        console.log("Google Auth API: Verifying token...");
        // Verify Firebase Token
        let decodedToken;
        if (token === "demo-google-token" || token === "expo-go-test-token") {
            console.log("Google Auth API: Demo Mode - Bypassing verification for student demo");
            decodedToken = {
                email: "student@gmail.com",
                name: "Sameer Student",
                picture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120",
            };
        } else {
            try {
                decodedToken = await adminAuth.verifyIdToken(token);
                console.log("Google Auth API: Token verified for email:", decodedToken.email);
            } catch (verifyError: any) {
                console.error("Google Auth API: Token verification failed:", verifyError);
                return NextResponse.json({ error: "Invalid Token: " + verifyError.message }, { status: 401 });
            }
        }

        const { email, name, picture } = decodedToken;

        if (!email) {
            console.log("Google Auth API: Email missing in token");
            return NextResponse.json({ error: "Invalid token payload: Email missing" }, { status: 400 });
        }

        console.log("Google Auth API: Finding/Creating user in DB...");
        // Find or Create User
        let user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.log("Google Auth API: User not found, creating new one...");
            // Create new user
            user = await prisma.user.create({
                data: {
                    name: name || "Firebase User",
                    email: email,
                    // phone: undefined,
                    profilePhoto: picture,
                    role: "STUDENT",
                    status: "ACTIVE",
                    emailVerified: true,
                },
            });
            console.log("Google Auth API: New user created:", user.id);
        } else {
            console.log("Google Auth API: Existing user found:", user.id);
        }

        // Generate App Token
        const appToken = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        const response = NextResponse.json({
            success: true,
            token: appToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                picture: user.profilePhoto,
            },
        });

        // Set Cookie
        const cookie = setAuthCookie(appToken);
        response.cookies.set(cookie);

        return response;

    } catch (error) {
        console.error("Firebase verify error (Catch-All):", error);
        return NextResponse.json({ error: "Authentication failed" }, { status: 500 }); // Return 500 instead of 401 for unknown
    }
}
