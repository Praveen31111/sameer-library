import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// GET: List all rooms (optionally by branch)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get("branchId");

        const where = branchId ? { branchId } : {};

        const rooms = await prisma.room.findMany({
            where,
            include: {
                branch: { select: { name: true } },
                _count: { select: { seats: true } }
            },
            orderBy: { name: "asc" }
        });

        return NextResponse.json({
            rooms: rooms.map(r => ({
                id: r.id,
                name: r.name,
                capacity: r.capacity,
                photo: r.photo,
                isActive: r.isActive,
                branchId: r.branchId,
                branchName: r.branch.name,
                seatCount: r._count.seats
            }))
        });
    } catch (error) {
        console.error("Get rooms error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Create new room
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { branchId, name, capacity, photo } = body;

        if (!branchId || !name) {
            return NextResponse.json({ error: "Branch ID and name are required" }, { status: 400 });
        }

        const room = await prisma.room.create({
            data: {
                branchId,
                name,
                capacity: Number(capacity) || 20,
                photo: photo || null,
                isActive: true
            }
        });

        return NextResponse.json({ success: true, room });
    } catch (error: any) {
        console.error("Create room error detailed:", error);
        return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
    }
}

// PATCH: Update room (rename, change capacity, photo)
export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, name, capacity, photo, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (capacity !== undefined) updateData.capacity = capacity;
        if (photo !== undefined) updateData.photo = photo;
        if (isActive !== undefined) updateData.isActive = isActive;

        const room = await prisma.room.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({ success: true, room });
    } catch (error) {
        console.error("Update room error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE: Delete room (and all its seats)
export async function DELETE(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Room ID is required" }, { status: 400 });
        }

        // Check for active bookings
        const bookingCount = await prisma.booking.count({
            where: { roomId: id, status: { in: ["PENDING", "APPROVED"] } }
        });

        if (bookingCount > 0) {
            return NextResponse.json({
                error: "Cannot delete room with active bookings"
            }, { status: 400 });
        }

        // Delete all seats first
        await prisma.seat.deleteMany({ where: { roomId: id } });
        // Then delete the room
        await prisma.room.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete room error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
