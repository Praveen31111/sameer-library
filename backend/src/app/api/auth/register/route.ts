import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, generateToken, setAuthCookie } from "@/lib/auth";
import { z } from "zod";

const registerSchema = z.object({
    name: z.string().min(2),
    email: z.email(),
    phone: z.string().min(10),
    password: z.string().min(8),
    college: z.string().optional(),
    course: z.string().optional(),
});

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const data = registerSchema.parse(body);

        // Check if user exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email: data.email }, { phone: data.phone }],
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "User with this email or phone already exists" },
                { status: 400 }
            );
        }

        // Create user
        const passwordHash = await hashPassword(data.password);
        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                passwordHash,
                college: data.college,
                course: data.course,
                role: "STUDENT",
                status: "ACTIVE", // For demo; should be PENDING_VERIFICATION in production
            },
        });

        // Generate token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        const response = NextResponse.json(
            {
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            },
            { status: 201 }
        );

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
        console.error("Register error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
