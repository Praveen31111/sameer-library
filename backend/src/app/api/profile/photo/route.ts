import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { photo } = body;

        if (!photo) {
            return NextResponse.json({ error: "No photo provided" }, { status: 400 });
        }

        // Validate base64 image
        if (!photo.startsWith("data:image/")) {
            return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
        }

        // For simplicity, store the base64 directly in the database
        // In production, you would upload to a cloud storage (S3, Cloudinary, etc.)
        await prisma.user.update({
            where: { id: user.id },
            data: { profilePhoto: photo }
        });

        return NextResponse.json({
            success: true,
            photoUrl: photo,
            message: "Photo updated successfully"
        });
    } catch (error) {
        console.error("Photo upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload photo" },
            { status: 500 }
        );
    }
}
