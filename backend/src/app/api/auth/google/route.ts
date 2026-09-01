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
        let decodedToken: { email?: string; name?: string; picture?: string } | null = null;
        if (token === "demo-google-token" || token === "expo-go-test-token") {
            console.log("Google Auth API: Demo Mode - Bypassing verification for student demo");
            decodedToken = {
                email: "student@gmail.com",
                name: "Sameer Student",
                picture: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120",
            };
        } else {
            try {
                const fbDecoded = await adminAuth.verifyIdToken(token);
                decodedToken = {
                    email: fbDecoded.email,
                    name: fbDecoded.name,
                    picture: fbDecoded.picture,
                };
                console.log("Google Auth API: Firebase Token verified for email:", decodedToken.email);
            } catch (verifyError: any) {
                console.log("Google Auth API: Firebase verify failed, checking Google OAuth TokenInfo API...");
                try {
                    const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
                    const tokenData = await tokenRes.json();
                    if (tokenRes.ok && tokenData.email) {
                        decodedToken = {
                            email: tokenData.email,
                            name: tokenData.name || tokenData.given_name || "Google Student",
                            picture: tokenData.picture || null,
                        };
                        console.log("Google Auth API: Google OAuth Token verified for email:", decodedToken.email);
                    } else {
                        throw new Error(tokenData.error_description || "Invalid Google ID token");
                    }
                } catch (googleError: any) {
                    console.error("Google Auth API: Token verification failed:", googleError);
                    return NextResponse.json({ error: "Invalid Token: " + (googleError.message || verifyError.message) }, { status: 401 });
                }
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
