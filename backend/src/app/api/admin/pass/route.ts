import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import QRCode from "qrcode";
import jwt from "jsonwebtoken";

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || "sameer_library_secure_jwt_token_2026";

// GET: Generate or fetch a digital library pass for a booking
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const bookingId = url.searchParams.get("bookingId");

        if (!bookingId) {
            return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
        }

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                student: { select: { id: true, name: true, phone: true, email: true, profilePhoto: true } },
                seat: { select: { seatNumber: true } },
                room: { select: { name: true } },
                branch: { select: { id: true, name: true, code: true, address: true, city: true } },
                libraryPass: true
            }
        });

        if (!booking) {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }

        // Only student or admin/owner can access pass
        if (user.role === "STUDENT" && booking.studentId !== user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        let pass = booking.libraryPass;

        // If pass doesn't exist yet, auto-create one
        if (!pass) {
            const passNum = `SL-${booking.branch.code}-${booking.seat.seatNumber}-${Date.now().toString().slice(-4)}`;
            const barcodeNumber = `890${Date.now().toString().slice(-9)}`;

            // Generate secure QR token containing verification payload
            const qrToken = jwt.sign({
                sub: booking.student.id,
                bookingId: booking.id,
                branchId: booking.branch.id,
                seat: booking.seat.seatNumber,
                type: "LIBRARY_ATTENDANCE_PASS"
            }, JWT_SECRET, { expiresIn: "365d" });

            pass = await prisma.libraryPass.create({
                data: {
                    passNumber: passNum,
                    qrToken: qrToken,
                    barcodeData: barcodeNumber,
                    status: "ACTIVE",
                    validUntil: booking.endDate,
                    studentId: booking.student.id,
                    bookingId: booking.id,
                    branchId: booking.branch.id,
                }
            });
        }

        // Generate QR code Data URL for rendering
        const qrCodeDataUrl = await QRCode.toDataURL(pass.qrToken, {
            width: 250,
            margin: 1,
            color: {
                dark: "#0f172a",
                light: "#ffffff"
            }
        });

        return NextResponse.json({
            pass: {
                id: pass.id,
                passNumber: pass.passNumber,
                barcodeData: pass.barcodeData,
                status: pass.status,
                issuedAt: pass.issuedAt,
                validUntil: pass.validUntil,
                qrCodeDataUrl: qrCodeDataUrl,
            },
            student: {
                id: booking.student.id,
                name: booking.student.name,
                phone: booking.student.phone,
                email: booking.student.email,
                profilePhoto: booking.student.profilePhoto,
            },
            seat: {
                seatNumber: booking.seat.seatNumber,
                roomName: booking.room.name,
                branchName: booking.branch.name,
                branchCode: booking.branch.code,
                address: `${booking.branch.address}, ${booking.branch.city}`,
                planType: booking.planType,
            }
        });

    } catch (error) {
        console.error("Fetch library pass error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
