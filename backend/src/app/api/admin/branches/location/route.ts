import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// POST: Set or update a branch's geofencing GPS coordinates and radius
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { branchId, latitude, longitude, geofenceRadiusMeters = 75 } = body;

        if (!branchId || latitude === undefined || longitude === undefined) {
            return NextResponse.json({ error: "branchId, latitude and longitude are required" }, { status: 400 });
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const radius = parseInt(geofenceRadiusMeters, 10) || 75;

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return NextResponse.json({ error: "Invalid GPS coordinates" }, { status: 400 });
        }

        const updatedBranch = await prisma.branch.update({
            where: { id: branchId },
            data: {
                latitude: lat,
                longitude: lng,
                geofenceRadiusMeters: radius,
            }
        });

        return NextResponse.json({
            success: true,
            message: `Geofence coordinates saved for ${updatedBranch.name}`,
            branch: {
                id: updatedBranch.id,
                name: updatedBranch.name,
                latitude: updatedBranch.latitude,
                longitude: updatedBranch.longitude,
                geofenceRadiusMeters: updatedBranch.geofenceRadiusMeters,
            }
        });

    } catch (error) {
        console.error("Save branch location error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
