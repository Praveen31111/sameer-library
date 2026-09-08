import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || "sameer_library_secure_jwt_token_2026";

// GET: Fetch or initialize the Gate Attendance QR Pass for a branch
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        let branchId = url.searchParams.get("branchId");

        let branch;
        if (branchId) {
            branch = await prisma.branch.findUnique({ where: { id: branchId } });
        } else {
            branch = await prisma.branch.findFirst({
                where: { isActive: true },
                orderBy: { createdAt: "asc" }
            });
        }

        if (!branch) {
            return NextResponse.json({ error: "No branch found" }, { status: 404 });
        }

        // If no gate pass token exists yet, generate the initial one
        let token = branch.gatePassToken;
        let updatedAt = branch.gatePassUpdatedAt;

        if (!token) {
            token = jwt.sign(
                {
                    type: "GATE_PASS",
                    branchId: branch.id,
                    branchCode: branch.code,
                    v: Date.now(),
                },
                JWT_SECRET
            );
            updatedAt = new Date();

            await prisma.branch.update({
                where: { id: branch.id },
                data: {
                    gatePassToken: token,
                    gatePassUpdatedAt: updatedAt,
                }
            });
        }

        // Generate high-resolution QR code data URL (PNG)
        const qrCodeDataUrl = await QRCode.toDataURL(token, {
            errorCorrectionLevel: "H",
            margin: 2,
            width: 450,
            color: {
                dark: "#0f172a",
                light: "#ffffff",
            }
        });

        return NextResponse.json({
            success: true,
            branch: {
                id: branch.id,
                name: branch.name,
                code: branch.code,
                address: branch.address,
                city: branch.city,
                latitude: branch.latitude,
                longitude: branch.longitude,
                geofenceRadiusMeters: branch.geofenceRadiusMeters,
                gatePassUpdatedAt: updatedAt,
            },
            qrToken: token,
            qrCodeUrl: qrCodeDataUrl,
        });

    } catch (error) {
        console.error("Fetch gate pass error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Admin clicks "Regenerate Gate QR Code" - Rotates token, invalidates old posters!
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { branchId } = body;

        if (!branchId) {
            return NextResponse.json({ error: "branchId is required" }, { status: 400 });
        }

        const branch = await prisma.branch.findUnique({ where: { id: branchId } });
        if (!branch) {
            return NextResponse.json({ error: "Branch not found" }, { status: 404 });
        }

        // Generate brand new token (rotates previous version 'v')
        const newToken = jwt.sign(
            {
                type: "GATE_PASS",
                branchId: branch.id,
                branchCode: branch.code,
                v: Date.now(),
            },
            JWT_SECRET
        );
        const updatedAt = new Date();

        await prisma.branch.update({
            where: { id: branch.id },
            data: {
                gatePassToken: newToken,
                gatePassUpdatedAt: updatedAt,
            }
        });

        // Generate updated QR code image
        const qrCodeDataUrl = await QRCode.toDataURL(newToken, {
            errorCorrectionLevel: "H",
            margin: 2,
            width: 450,
            color: {
                dark: "#0f172a",
                light: "#ffffff",
            }
        });

        return NextResponse.json({
            success: true,
            message: "Gate QR Code regenerated successfully! Purana QR code ab turant expire ho gaya hai.",
            branch: {
                id: branch.id,
                name: branch.name,
                code: branch.code,
                gatePassUpdatedAt: updatedAt,
            },
            qrToken: newToken,
            qrCodeUrl: qrCodeDataUrl,
        });

    } catch (error) {
        console.error("Regenerate gate pass error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
