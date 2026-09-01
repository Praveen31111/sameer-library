import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, generateToken, setAuthCookie } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

// Special admin credentials
const ADMIN_EMAIL = "sameer7518@gmail.com";
const ADMIN_PASSWORD = "sameer7518";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        // Check if this is the special admin login
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            // Find or create the admin user
            let admin = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: ADMIN_EMAIL },
                        { email: `${ADMIN_EMAIL}@sameerlibrary.com` }
                    ],
                    role: { in: ["ADMIN", "OWNER"] }
                }
            });

            if (!admin) {
                // Create admin user
                admin = await prisma.user.create({
                    data: {
                        name: "Sameer Library Admin",
                        email: `${ADMIN_EMAIL}@sameerlibrary.com`,
                        passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
                        role: "OWNER",
                        status: "ACTIVE",
                        emailVerified: true,
                    }
                });
            }

            // Generate token
            const token = generateToken({
                userId: admin.id,
                email: admin.email,
                role: admin.role,
            });

            const response = NextResponse.json({
                success: true,
                user: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                },
                redirectUrl: "/admin",
            });

            // Set cookie
            const cookie = setAuthCookie(token);
            response.cookies.set(cookie);

            return response;
        }

        // Regular admin login with email/password from database
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Check if user is admin or owner
        if (user.role !== "ADMIN" && user.role !== "OWNER") {
            return NextResponse.json(
                { error: "Access denied. Admin credentials required." },
                { status: 403 }
            );
        }

        // Verify password
        if (!user.passwordHash) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json(
                { error: "Invalid credentials" },
                { status: 401 }
            );
        }

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            redirectUrl: "/admin",
        });

        // Set cookie
        const cookie = setAuthCookie(token);
        response.cookies.set(cookie);

        return response;
    } catch (error) {
        console.error("Admin login error:", error);
        return NextResponse.json(
            { error: "Login failed" },
            { status: 500 }
        );
    }
}
