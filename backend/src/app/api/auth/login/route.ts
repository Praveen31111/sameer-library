import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, generateToken, setAuthCookie } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const data = loginSchema.parse(body);

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (!user || !user.passwordHash) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Verify password
        const isValid = await verifyPassword(data.password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Check if user is blocked
        if (user.status === "BLOCKED") {
            return NextResponse.json(
                { error: "Your account has been blocked. Contact support." },
                { status: 403 }
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
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

        // Set cookie
        const cookie = setAuthCookie(token);
        response.cookies.set(cookie);

        return response;
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation failed", issues: error.issues },
                { status: 400 }
            );
        }
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
