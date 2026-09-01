import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export async function GET() {
    try {
        const branches = await prisma.branch.findMany({
            where: { isActive: true },
            include: {
                rooms: {
                    where: { isActive: true },
                    include: {
                        _count: {
                            select: { seats: true },
                        },
                    },
                },
                _count: {
                    select: { rooms: true },
                },
            },
            orderBy: { name: "asc" },
        });

        // Transform data
        const result = branches.map((branch) => ({
            id: branch.id,
            name: branch.name,
            code: branch.code,
            address: branch.address,
            city: branch.city,
            photo: branch.photo,
            roomCount: branch._count.rooms,
            totalSeats: branch.rooms.reduce((sum, room) => sum + room._count.seats, 0),
            rooms: branch.rooms.map((room) => ({
                id: room.id,
                name: room.name,
                capacity: room.capacity,
                photo: room.photo,
                seatCount: room._count.seats,
            })),
        }));

        return NextResponse.json({ branches: result });
    } catch (error) {
        console.error("Get branches error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
