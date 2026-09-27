import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface StudentImportRecord {
    name: string;
    phone: string;
    email?: string;
    branchCodeOrName?: string;
    roomName?: string;
    seatNumber?: string;
    shift?: string; // MORNING, EVENING, FULL_DAY
    totalFee?: number;
    paidAmount?: number;
    dueAmount?: number;
    startDate?: string;
    endDate?: string;
    college?: string;
    course?: string;
}

export async function POST(req: Request) {
    try {
        const adminUser = await getCurrentUser();
        if (!adminUser || (adminUser.role !== "ADMIN" && adminUser.role !== "OWNER")) {
            return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
        }

        const body = await req.json();
        const { students, defaultBranchId, defaultPassword = "Sameer@123" } = body;

        if (!Array.isArray(students) || students.length === 0) {
            return NextResponse.json({
                success: false,
                error: "At least one student record is required for bulk import"
            }, { status: 400 });
        }

        // Fetch all active branches and their rooms
        const branches = await prisma.branch.findMany({
            where: { isActive: true },
            include: {
                rooms: {
                    where: { isActive: true },
                    include: { seats: true }
                }
            }
        });

        if (branches.length === 0) {
            return NextResponse.json({
                success: false,
                error: "No active library branches found. Please create a branch first."
            }, { status: 400 });
        }

        // Default branch (either provided or first available)
        const primaryBranch = branches.find(b => b.id === defaultBranchId) || branches[0];

        const defaultPasswordHash = await hashPassword(defaultPassword);

        let importedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;
        const errors: Array<{ row: number; name: string; reason: string }> = [];
        const importedStudentsList: any[] = [];

        for (let i = 0; i < students.length; i++) {
            const raw = students[i] as StudentImportRecord;
            const rowNumber = i + 1;

            try {
                const name = (raw.name || "").trim();
                let phone = (raw.phone || "").replace(/\D/g, ""); // strip non-digits

                // Remove leading +91 or 91 or 0 if 12 or 11 digits
                if (phone.length === 12 && phone.startsWith("91")) {
                    phone = phone.slice(2);
                } else if (phone.length === 11 && phone.startsWith("0")) {
                    phone = phone.slice(1);
                }

                if (!name || name.length < 2) {
                    failedCount++;
                    errors.push({ row: rowNumber, name: name || "Unknown", reason: "Valid student name is required" });
                    continue;
                }

                if (!phone || phone.length !== 10) {
                    failedCount++;
                    errors.push({ row: rowNumber, name, reason: `Invalid 10-digit mobile number: "${raw.phone}"` });
                    continue;
                }

                const email = (raw.email || "").trim() || `${phone}@sameerlibrary.com`;

                // 1. Resolve Target Branch
                let branch = primaryBranch;
                if (raw.branchCodeOrName) {
                    const match = branches.find(b =>
                        b.code.toLowerCase() === raw.branchCodeOrName?.toLowerCase() ||
                        b.name.toLowerCase().includes(raw.branchCodeOrName?.toLowerCase() || "")
                    );
                    if (match) branch = match;
                }

                // 2. Resolve Target Room
                let room = branch.rooms[0];
                if (raw.roomName && branch.rooms.length > 0) {
                    const roomMatch = branch.rooms.find(r =>
                        r.name.toLowerCase().includes(raw.roomName?.toLowerCase() || "")
                    );
                    if (roomMatch) room = roomMatch;
                }

                if (!room) {
                    // Auto-create default room if branch has no rooms
                    room = await prisma.room.create({
                        data: {
                            branchId: branch.id,
                            name: "Main Study Hall",
                            capacity: 50,
                            isActive: true
                        },
                        include: { seats: true }
                    });
                }

                // 3. Resolve Target Seat
                let seat: any = null;
                const requestedSeatNumber = (raw.seatNumber || "").trim().toUpperCase();

                if (requestedSeatNumber) {
                    seat = await prisma.seat.findFirst({
                        where: {
                            roomId: room.id,
                            seatNumber: requestedSeatNumber
                        }
                    });

                    if (!seat) {
                        // Create seat if it doesn't exist
                        seat = await prisma.seat.create({
                            data: {
                                roomId: room.id,
                                seatNumber: requestedSeatNumber,
                                status: "RESERVED"
                            }
                        });
                    }
                } else {
                    // Find first available seat or create one
                    seat = await prisma.seat.findFirst({
                        where: {
                            roomId: room.id,
                            status: "AVAILABLE"
                        }
                    });

                    if (!seat) {
                        const totalSeatsCount = await prisma.seat.count({ where: { roomId: room.id } });
                        seat = await prisma.seat.create({
                            data: {
                                roomId: room.id,
                                seatNumber: `S-${totalSeatsCount + 1}`,
                                status: "RESERVED"
                            }
                        });
                    }
                }

                // 4. Create or Update Student User
                let studentUser = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { phone },
                            { email }
                        ]
                    }
                });

                let isNewUser = false;
                if (!studentUser) {
                    isNewUser = true;
                    studentUser = await prisma.user.create({
                        data: {
                            name,
                            phone,
                            email,
                            passwordHash: defaultPasswordHash,
                            role: "STUDENT",
                            status: "ACTIVE",
                            phoneVerified: true,
                            college: raw.college?.trim() || null,
                            course: raw.course?.trim() || null,
                        }
                    });
                    importedCount++;
                } else {
                    // Update existing student profile to active
                    studentUser = await prisma.user.update({
                        where: { id: studentUser.id },
                        data: {
                            name,
                            status: "ACTIVE",
                            college: raw.college?.trim() || studentUser.college,
                            course: raw.course?.trim() || studentUser.course,
                        }
                    });
                    updatedCount++;
                }

                // 5. Calculate Financials & Dates
                const totalFee = Number(raw.totalFee) || 1000;
                const paidAmount = Number(raw.paidAmount) || 0;
                const dueAmount = raw.dueAmount !== undefined
                    ? Number(raw.dueAmount)
                    : Math.max(0, totalFee - paidAmount);

                const paymentStatus = dueAmount <= 0
                    ? "PAID"
                    : paidAmount > 0
                    ? "PARTIAL"
                    : "DUE";

                const now = new Date();
                const startDate = raw.startDate ? new Date(raw.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
                const endDate = raw.endDate ? new Date(raw.endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

                // 6. Check existing booking for student to avoid duplicate overlapping
                const existingBooking = await prisma.booking.findFirst({
                    where: {
                        studentId: studentUser.id,
                        status: "APPROVED"
                    }
                });

                let booking: any = null;
                if (existingBooking) {
                    // Update existing active booking with new dues and seat
                    booking = await prisma.booking.update({
                        where: { id: existingBooking.id },
                        data: {
                            branchId: branch.id,
                            roomId: room.id,
                            seatId: seat.id,
                            totalFee,
                            paidAmount,
                            dueAmount,
                            paymentStatus,
                            amount: totalFee,
                            planType: "MONTHLY",
                            notes: `Updated via Bulk Onboarding on ${new Date().toLocaleDateString('en-IN')}`,
                        }
                    });
                } else {
                    // Create new Approved booking
                    booking = await prisma.booking.create({
                        data: {
                            studentId: studentUser.id,
                            branchId: branch.id,
                            roomId: room.id,
                            seatId: seat.id,
                            approvedById: adminUser.id,
                            startDate,
                            endDate,
                            planType: "MONTHLY",
                            status: "APPROVED",
                            amount: totalFee,
                            totalFee,
                            paidAmount,
                            dueAmount,
                            paymentStatus,
                            autoRenew: true,
                            billingCycleMonth: 1,
                            lastBilledAt: now,
                            nextDueDate: dueAmount > 0 ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
                            notes: `Bulk Onboarded by Admin on ${new Date().toLocaleDateString('en-IN')}`,
                        }
                    });
                }

                // 7. If paidAmount > 0, log opening payment
                if (paidAmount > 0) {
                    await prisma.payment.create({
                        data: {
                            bookingId: booking.id,
                            studentId: studentUser.id,
                            amount: paidAmount,
                            currency: "INR",
                            status: "SUCCESS",
                            paymentMode: "OFFLINE_CASH",
                            provider: "cash",
                            remarks: `Opening fee collection (Bulk Import)`,
                            collectedById: adminUser.id,
                            receiptNumber: `SL-REC-${Date.now().toString().slice(-6)}-${rowNumber}`,
                        }
                    });
                }

                // 8. Auto-create or update Digital Library Pass
                const passNumber = `SL-${phone.slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;
                const qrToken = `PASS_${studentUser.id}_${Date.now()}`;
                const barcodeData = `SL${phone}`;

                await prisma.libraryPass.upsert({
                    where: { studentId: studentUser.id },
                    update: {
                        status: "ACTIVE",
                        validUntil: endDate,
                        branchId: branch.id,
                        bookingId: booking.id,
                    },
                    create: {
                        studentId: studentUser.id,
                        branchId: branch.id,
                        bookingId: booking.id,
                        passNumber,
                        qrToken,
                        barcodeData,
                        status: "ACTIVE",
                        validUntil: endDate,
                    }
                });

                importedStudentsList.push({
                    name: studentUser.name,
                    phone: studentUser.phone,
                    seatNumber: seat.seatNumber,
                    roomName: room.name,
                    branchName: branch.name,
                    dueAmount,
                    status: "APPROVED",
                });

            } catch (studentErr: any) {
                console.error(`Row ${rowNumber} import error:`, studentErr);
                failedCount++;
                errors.push({
                    row: rowNumber,
                    name: raw.name || `Row ${rowNumber}`,
                    reason: studentErr?.message || "Database write error"
                });
            }
        }

        const sampleWelcomeMessage = `Namaste! Sameer Digital Library me aapka swagat hai. Aapka account activate ho gaya hai.\n\n📲 App Download karein: https://sameer-library-ten.vercel.app\n🔑 Login Mobile: [Aapka Mobile Number]\n🔒 Password: ${defaultPassword}\n\nApni seat, attendance aur fee status app me dekhein. Kisi bhi sahayata ke liye admin se sampark karein.`;

        return NextResponse.json({
            success: true,
            totalSubmitted: students.length,
            importedCount,
            updatedCount,
            failedCount,
            errors,
            importedStudents: importedStudentsList,
            sampleWelcomeMessage,
            message: `Successfully processed ${students.length} students (${importedCount} new, ${updatedCount} updated, ${failedCount} errors).`
        });

    } catch (error: any) {
        console.error("Bulk student import API error:", error);
        return NextResponse.json({
            success: false,
            error: error?.message || "Internal server error during bulk import"
        }, { status: 500 });
    }
}
