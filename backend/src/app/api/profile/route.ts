
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const profileSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(10).optional(),
    college: z.string().optional(),
    course: z.string().optional(),
    profilePhoto: z.string().optional(),
});

export const dynamic = 'force-dynamic';
export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const data = profileSchema.parse(body);

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.email && { email: data.email }),
                ...(data.phone && { phone: data.phone }),
                ...(data.college !== undefined && { college: data.college }),
                ...(data.course !== undefined && { course: data.course }),
                ...(data.profilePhoto !== undefined && { profilePhoto: data.profilePhoto }),
            }
        });

        return NextResponse.json({
            success: true,
            user: {
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                college: updatedUser.college,
                course: updatedUser.course,
                profilePhoto: updatedUser.profilePhoto,
            }
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation failed", issues: error.issues },
                { status: 400 }
            );
        }
        console.error("Update profile error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
