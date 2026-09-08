import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import jwt from "jsonwebtoken";

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || "sameer_library_secure_jwt_token_2026";

/**
 * Haversine formula to compute great-circle distance between two GPS points in meters
 */
function getHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// POST: Student scans Library Pass QR with Live GPS Coordinates
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { qrToken, latitude, longitude, selfiePhoto } = body;

        if (!qrToken) {
            return NextResponse.json({ error: "QR code data is required" }, { status: 400 });
        }

        // 1. Verify and decode QR token
        let decoded: any;
        try {
            decoded = jwt.verify(qrToken, JWT_SECRET);
        } catch (jwtErr) {
            return NextResponse.json({ error: "Invalid or expired QR code pass" }, { status: 400 });
        }

        let passStudentId = user.id;
        let branchId = decoded.branchId;
        let seatNumber = "N/A";
        let bookingId = decoded.bookingId;

        // CASE A: UNIVERSAL GATE QR PASS (Scanned from Gate Poster)
        if (decoded.type === "GATE_PASS") {
            const branch = await prisma.branch.findUnique({
                where: { id: decoded.branchId }
            });

            if (!branch) {
                return NextResponse.json({ error: "Library branch not found" }, { status: 404 });
            }

            // Verify if admin has rotated the gate pass token
            if (branch.gatePassToken !== qrToken) {
                return NextResponse.json({
                    error: "Yeh Gate QR Pass expire ho chuka hai (Admin ne naya pass rotate kiya hai). Kripya gate par laga current QR scan karein."
                }, { status: 403 });
            }

            // Find the student's active approved booking for this branch
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

            const activeBooking = await prisma.booking.findFirst({
                where: {
                    studentId: user.id,
                    branchId: branch.id,
                    status: "APPROVED",
                    endDate: { gte: startOfDay }
                },
                include: {
                    seat: { select: { seatNumber: true } },
                    room: { select: { name: true } }
                },
                orderBy: { endDate: "desc" }
            });

            if (!activeBooking) {
                return NextResponse.json({
                    error: `Aapka ${branch.name} me koi active/approved admission nahi hai. Kripya pehle admin se seat approve karwayein.`
                }, { status: 403 });
            }

            passStudentId = user.id;
            seatNumber = activeBooking.seat.seatNumber;
            bookingId = activeBooking.id;

        } else {
            // CASE B: STUDENT PERSONAL ID PASS
            passStudentId = decoded.sub;
            seatNumber = decoded.seat || "N/A";

            if (user.role === "STUDENT" && user.id !== passStudentId) {
                return NextResponse.json({
                    error: "This pass belongs to another student. Attendance denied."
                }, { status: 403 });
            }

            // Verify that this student has an APPROVED active admission
            const approvedBooking = await prisma.booking.findFirst({
                where: {
                    studentId: passStudentId,
                    status: "APPROVED"
                }
            });

            if (!approvedBooking) {
                return NextResponse.json({
                    error: "Sirf Approved students hi attendance mark kar sakte hain. Aapka admission approve hona baki hai."
                }, { status: 403 });
            }
        }

        // 2. Fetch Branch details and its set Geofence GPS coordinates
        const branch = await prisma.branch.findUnique({
            where: { id: branchId }
        });

        if (!branch) {
            return NextResponse.json({ error: "Branch not found" }, { status: 404 });
        }

        // 3. GEOFENCE SECURITY VALIDATION
        let calculatedDistance: number | null = null;
        const allowedRadius = branch.geofenceRadiusMeters || 75; // Default 75 meters

        if (branch.latitude !== null && branch.longitude !== null) {
            // Student must provide coordinates when branch has GPS configured
            if (latitude === undefined || longitude === undefined || latitude === null || longitude === null) {
                return NextResponse.json({
                    error: "GPS Location permission required. Please enable location to mark attendance inside the library."
                }, { status: 400 });
            }

            const studentLat = Number(latitude);
            const studentLng = Number(longitude);

            calculatedDistance = getHaversineDistanceMeters(
                branch.latitude,
                branch.longitude,
                studentLat,
                studentLng
            );

            // If outside allowed radius, REJECT attendance with distance warning!
            if (calculatedDistance > allowedRadius) {
                return NextResponse.json({
                    error: `Aap library premises ke bahar hain (Distance: ${Math.round(calculatedDistance)} meters, Allowed: ${allowedRadius}m). Attendance sirf library ke andar hi mark ho sakti hai.`,
                    distanceMeters: Math.round(calculatedDistance),
                    allowedRadius: allowedRadius
                }, { status: 403 });
            }
        }

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

        // 4. Check if student already checked in today without checking out
        const openAttendance = await prisma.attendance.findFirst({
            where: {
                studentId: passStudentId,
                branchId: branchId,
                checkInAt: { gte: startOfDay },
                checkOutAt: null
            },
            orderBy: { checkInAt: "desc" }
        });

        if (openAttendance) {
            // Perform CHECK-OUT
            const updated = await prisma.attendance.update({
                where: { id: openAttendance.id },
                data: {
                    checkOutAt: now
                }
            });

            const diffMins = Math.round((now.getTime() - new Date(openAttendance.checkInAt).getTime()) / (1000 * 60));
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;

            return NextResponse.json({
                success: true,
                action: "CHECK_OUT",
                message: `Check-out successful! Total session: ${hours}h ${mins}m`,
                checkInAt: openAttendance.checkInAt,
                checkOutAt: now,
                distanceMeters: calculatedDistance ? Math.round(calculatedDistance) : 0,
                seat: seatNumber,
                branch: branch.name
            });
        }

        // 5. Perform CHECK-IN with 0-Cost 24h Selfie Verification
        const newAttendance = await prisma.attendance.create({
            data: {
                studentId: passStudentId,
                branchId: branchId,
                checkInAt: now,
                source: "QR_CODE",
                latitude: latitude ? Number(latitude) : null,
                longitude: longitude ? Number(longitude) : null,
                distanceMeters: calculatedDistance ? Math.round(calculatedDistance) : null,
                isVerifiedLocation: true,
                selfiePhoto: typeof selfiePhoto === "string" && selfiePhoto.length > 50 ? selfiePhoto : null,
            }
        });

        // 0-Cost 24-Hour Auto-Purge: Delete selfie photos older than 24 hours to guarantee 0 database bloat
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        prisma.attendance.updateMany({
            where: {
                checkInAt: { lt: twentyFourHoursAgo },
                selfiePhoto: { not: null }
            },
            data: {
                selfiePhoto: null
            }
        }).catch(err => console.warn("24h selfie cleanup warning:", err));

        return NextResponse.json({
            success: true,
            action: "CHECK_IN",
            message: `Check-in marked successfully for Seat ${seatNumber} at ${branch.name}! Location & Live Selfie Verified.`,
            checkInAt: newAttendance.checkInAt,
            seat: seatNumber,
            branch: branch.name,
            distanceMeters: calculatedDistance ? Math.round(calculatedDistance) : 0,
            hasSelfie: Boolean(newAttendance.selfiePhoto),
        });

    } catch (error) {
        console.error("Geofenced scan attendance error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
