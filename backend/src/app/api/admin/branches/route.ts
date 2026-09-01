import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// GET: List all branches for admin
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const branches = await prisma.branch.findMany({
            include: {
                _count: { select: { rooms: true } },
                rooms: {
                    select: {
                        _count: { select: { seats: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({
            branches: branches.map(b => ({
                id: b.id,
                name: b.name,
                code: b.code,
                address: b.address,
                city: b.city,
                photo: b.photo,
                isActive: b.isActive,
                roomCount: b._count.rooms,
                totalSeats: b.rooms.reduce((sum, r) => sum + r._count.seats, 0),
                createdAt: b.createdAt
            }))
        });
    } catch (error) {
        console.error("Get branches error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Create new branch
export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, code, address, city, photo } = body;

        if (!name || !code) {
            return NextResponse.json({ error: "Name and code are required" }, { status: 400 });
        }

        // Check if code already exists
        const existing = await prisma.branch.findUnique({ where: { code } });
        if (existing) {
            return NextResponse.json({ error: "Branch code already exists" }, { status: 400 });
        }

        const branch = await prisma.branch.create({
            data: {
                name,
                code,
                address: address || "",
                city: city || "",
                photo: photo || null,
                ownerId: user.id,
                isActive: true
            }
        });

        return NextResponse.json({ success: true, branch });
    } catch (error) {
        console.error("Create branch error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH: Update branch
export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, name, address, city, photo, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (address !== undefined) updateData.address = address;
        if (city !== undefined) updateData.city = city;
        if (photo !== undefined) updateData.photo = photo;
        if (isActive !== undefined) updateData.isActive = isActive;

        const branch = await prisma.branch.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({ success: true, branch });
    } catch (error) {
        console.error("Update branch error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE: Delete branch
export async function DELETE(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Branch ID is required" }, { status: 400 });
        }

        // Check if branch has any bookings
        const bookingCount = await prisma.booking.count({ where: { branchId: id } });
        if (bookingCount > 0) {
            return NextResponse.json({
                error: "Cannot delete branch with existing bookings. Deactivate it instead."
            }, { status: 400 });
        }

        // Delete related data first (rooms, seats)
        const rooms = await prisma.room.findMany({ where: { branchId: id } });
        for (const room of rooms) {
            await prisma.seat.deleteMany({ where: { roomId: room.id } });
        }
        await prisma.room.deleteMany({ where: { branchId: id } });
        await prisma.branch.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete branch error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
