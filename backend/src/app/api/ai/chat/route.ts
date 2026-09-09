import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Fallback pricing if DB key missing
const DEFAULT_PRICING = {
    monthlyBasePrice: 1000,
    monthlyPrice: 1000,
    discountPercent: 0,
    discountActive: false,
    offerTitle: "Special Student Discount! Book your monthly seat now.",
};

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY || GEMINI_API_KEY;

        const body = await req.json();
        const { message, audioBase64, mimeType, mode, conversationHistory } = body;

        if ((!message || typeof message !== "string" || message.trim().length === 0) && !audioBase64) {
            return NextResponse.json({
                success: false,
                error: "Message or voice audio is required"
            }, { status: 400 });
        }

        // 1. Identify User Session
        let user: any = null;
        try {
            user = await getCurrentUser();
        } catch (authErr) {
            // Public visitor mode
            user = null;
        }

        // 2. Fetch Live Real-Time Dynamic Library Data from Database
        let pricing = DEFAULT_PRICING;
        try {
            const pricingRow = await prisma.systemConfig.findUnique({
                where: { key: "pricing" }
            });
            if (pricingRow?.value) {
                pricing = { ...DEFAULT_PRICING, ...JSON.parse(pricingRow.value) };
            }
        } catch (dbErr) {
            console.warn("AI DB pricing fetch warning:", dbErr);
        }

        // Fetch Branches & Room details
        let branches: any[] = [];
        let totalSeats = 0;
        let activeBookingsCount = 0;
        try {
            branches = await prisma.branch.findMany({
                where: { isActive: true },
                include: {
                    rooms: {
                        include: {
                            seats: true
                        }
                    }
                }
            });

            branches.forEach(b => {
                b.rooms?.forEach((r: any) => {
                    totalSeats += (r.seats?.length || 0);
                });
            });

            activeBookingsCount = await prisma.booking.count({
                where: { status: "APPROVED" }
            });
        } catch (branchErr) {
            console.warn("AI DB branches fetch warning:", branchErr);
        }

        const availableSeatsEstimate = Math.max(0, totalSeats - activeBookingsCount);

        // 3. User-Specific Context (Student or Admin)
        let studentContextStr = "";
        let adminContextStr = "";

        if (user && (user.role === "STUDENT" || mode === "STUDENT")) {
            try {
                const myBooking = await prisma.booking.findFirst({
                    where: {
                        studentId: user.id,
                        status: "APPROVED"
                    },
                    include: {
                        seat: true,
                        room: true,
                        branch: true
                    },
                    orderBy: { endDate: "desc" }
                });

                const todayAttendance = await prisma.attendance.findFirst({
                    where: {
                        studentId: user.id,
                        checkInAt: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0))
                        }
                    },
                    orderBy: { checkInAt: "desc" }
                });

                if (myBooking) {
                    studentContextStr = `
CURRENT LOGGED-IN STUDENT INFO:
- Student Name: ${user.name}
- Student Email: ${user.email}
- Student Phone: ${user.phone || "Not updated"}
- Assigned Seat: ${myBooking.seat?.seatNumber || "Reserved"}
- Study Room: ${myBooking.room?.name || "Main AC Hall"}
- Branch: ${myBooking.branch?.name || "Main Branch"}
- Total Monthly Fee: ₹${myBooking.totalFee}
- Fee Paid So Far: ₹${myBooking.paidAmount}
- Pending Due Balance: ₹${myBooking.dueAmount}
- Payment Status: ${myBooking.paymentStatus}
- Admission Valid Upto: ${new Date(myBooking.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
- Today's Attendance Punch: ${todayAttendance ? (todayAttendance.checkOutAt ? "Checked-Out" : "Checked-In (Active)") : "Not punched today yet"}
`;
                } else {
                    studentContextStr = `
CURRENT LOGGED-IN STUDENT INFO:
- Student Name: ${user.name}
- Admission Status: No active approved seat yet (Admission pending or new user).
`;
                }
            } catch (studentErr) {
                console.warn("AI Student context fetch error:", studentErr);
            }
        }

        if (user && (user.role === "ADMIN" || user.role === "OWNER" || mode === "ADMIN")) {
            try {
                const totalDuesAgg = await prisma.booking.aggregate({
                    where: { status: "APPROVED" },
                    _sum: { dueAmount: true, paidAmount: true }
                });

                const pendingApprovalsCount = await prisma.booking.count({
                    where: { status: "PENDING" }
                });

                const todayAttendanceCount = await prisma.attendance.count({
                    where: {
                        checkInAt: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0))
                        }
                    }
                });

                adminContextStr = `
ADMIN / OWNER PRIVILEGED AUDIT DATA:
- Total Enrolled Students: ${activeBookingsCount}
- Pending Admissions Needing Approval: ${pendingApprovalsCount}
- Total Fees Collected: ₹${totalDuesAgg._sum.paidAmount || 0}
- Total Pending Dues Across Library: ₹${totalDuesAgg._sum.dueAmount || 0}
- Today's Total Student Attendance Count: ${todayAttendanceCount}
`;
            } catch (adminErr) {
                console.warn("AI Admin context fetch error:", adminErr);
            }
        }

        // 4. Construct Highly Accurate Dynamic System Prompt for Sameer AI
        const branchSummary = branches.map(b => {
            const roomNames = b.rooms?.map((r: any) => `${r.name} (${r.seats?.length || 0} seats)`).join(", ") || "Main Study Hall";
            return `• ${b.name} (${b.city}, ${b.address}) - Rooms: ${roomNames}`;
        }).join("\n");

        const effectivePrice = pricing.discountActive && pricing.discountPercent > 0
            ? pricing.monthlyPrice
            : pricing.monthlyBasePrice;

        const systemInstruction = `
You are "Sameer AI", the official smart and courteous voice & chat assistant for Sameer Library (समीर लाइब्रेरी).
Your goal is to answer questions about the library with 100% accuracy, extreme politeness, and high clarity.

CRITICAL TONE & SPEECH FORMATTING RULES:
1. Speak in warm, respectful, natural Hindi or Hinglish (e.g. "Namaste! Sameer Library me..."). If the user asks in English, reply in friendly Indian English.
2. KEEP REPLIES CONCISE AND PUNCHY (2 to 4 sentences maximum) because your response is spoken aloud to the student through Text-to-Speech (TTS)!
3. DO NOT use markdown bold stars (like **text**), bullet stars (*), hashtags (###), or markdown tables, because TTS will speak these weirdly. Use clean, fluid conversational sentences.
4. Always address the user warmly.
5. Emphasize that Sameer Library provides a peaceful, world-class study environment for competitive exam students (UPSC, BPSC, SSC, Banking, Railways, NEET, JEE, etc.).

REAL-TIME DATABASE KNOWLEDGE BASE (LIVE CURRENT STATS):
- Library Name: Sameer Library (समीर डिजिटल लाइब्रेरी)
- Current Monthly Seat Fee: ₹${effectivePrice} per month${pricing.discountActive ? ` (Special Offer active: ${pricing.discountPercent}% OFF!)` : ""}
- Standard Base Price: ₹${pricing.monthlyBasePrice} per month
- Total Capacity: Approx ${totalSeats || 50} seats across all branches
- Current Available Seats: Approx ${availableSeatsEstimate} seats available for new admissions
- Active Branches:
${branchSummary || "• Sameer Library Main Branch (Patna / Bihar)"}
- Study Shifts Available:
  1. Morning Shift: 8:00 AM to 2:00 PM
  2. Evening Shift: 2:00 PM to 8:00 PM
  3. Full Day Shift: 8:00 AM to 10:00 PM (Most popular!)
- Facilities & Amenities:
  • High-Speed 5G Optical Fiber Wi-Fi
  • Fully Air Conditioned (AC) Silent Study Rooms
  • Ergonomic comfortable study chairs with spacious personal desks
  • Individual charging power sockets on every desk for laptop & mobile
  • Purified RO Drinking Water with hot & cold dispenser
  • Separate Clean Washrooms for Boys and Girls
  • Pin-drop silence atmosphere
  • 24x7 CCTV surveillance and security
  • Generator / Inverter Power Backup during electricity cuts
  • Discussion area and newspaper/magazine zone
- Wi-Fi Details: High-speed unlimited Wi-Fi is provided free to all enrolled students inside the library.
- Attendance Policy: Students mark attendance directly through the app using Gate QR scan + Instant live location & auto-selfie verification.
- How to Book a Seat / Register:
  Open the app, go to "Book Seat", select your branch, choose your preferred seat from the visual seat grid, select shift, and click submit. Admin approves your seat instantly.
- Library Rules:
  • Maintain strict pin-drop silence in the reading halls.
  • Keep mobile phones on silent mode. Take emergency calls in the corridor.
  • Eating meals is only permitted in the designated break zone.

${studentContextStr}
${adminContextStr}
`;

        // 5. Build conversation payload for Gemini
        const contents: any[] = [];

        // Append recent conversation history if provided
        if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
            conversationHistory.slice(-4).forEach((msg: any) => {
                if (msg.role === "user" || msg.role === "model" || msg.role === "assistant") {
                    contents.push({
                        role: msg.role === "assistant" ? "model" : msg.role,
                        parts: [{ text: String(msg.content || msg.text || "") }]
                    });
                }
            });
        }

        // Handle Audio Voice Query OR Text Query
        if (audioBase64) {
            contents.push({
                role: "user",
                parts: [
                    {
                        inline_data: {
                            mime_type: mimeType || "audio/m4a",
                            data: audioBase64
                        }
                    },
                    {
                        text: "A student just spoke this voice question to Sameer AI. In your response:\n1. On the first line, write 'TRANSCRIPT: <exact short text of what student asked in Hindi/English>'\n2. On the next line, write 'ANSWER: <your friendly concise answer according to Sameer Library rules>'"
                    }
                ]
            });
        } else {
            contents.push({
                role: "user",
                parts: [{ text: message }]
            });
        }

        // 6. Check if Gemini API key is available or provide instant live database answer
        if (!apiKey) {
            const q = (message || "").toLowerCase();
            let fallbackReply = "";
            let userTranscript = audioBase64 ? "Aapka aawaz sawal" : message;

            if (q.includes("fee") || q.includes("price") || q.includes("charge") || q.includes("paisa") || q.includes("kitna")) {
                fallbackReply = `Sameer Library me monthly seat fee abhi ₹${effectivePrice} hai. Isme AC study hall, 5G Wi-Fi aur RO drinking water shaamil hai.`;
            } else if (q.includes("seat") || q.includes("room") || q.includes("khali") || q.includes("available")) {
                fallbackReply = `Sameer Library me lagbhag ${availableSeatsEstimate} seats uplabdh hain. Aap Book tab se apni pasandida seat chun sakte hain.`;
            } else if (q.includes("wifi") || q.includes("wi-fi") || q.includes("password") || q.includes("internet")) {
                fallbackReply = `Sameer Library me 5G high-speed optical fiber Wi-Fi sabhi enrolled students ke liye bilkul free uplabdh hai.`;
            } else if (q.includes("time") || q.includes("timing") || q.includes("shift") || q.includes("kab")) {
                fallbackReply = `Sameer Library me teen shifts uplabdh hain: Morning (8 AM to 2 PM), Evening (2 PM to 8 PM) aur Full Day (8 AM to 10 PM).`;
            } else if (q.includes("rule") || q.includes("niyam")) {
                fallbackReply = `Library me strict pin-drop silence banaye rakhein, mobile phones silent rakhein aur khana keval break zone me khayein.`;
            } else if (user && (user.role === "STUDENT" || mode === "STUDENT")) {
                fallbackReply = `Aapki admission details database me active hain. Kisi bhi sahayata ke liye aap library counter se sampark kar sakte hain.`;
            } else {
                fallbackReply = `Namaste! Sameer Library me aapka swagat hai. Hamare yahan monthly fee ₹${effectivePrice} hai aur AC silent study rooms uplabdh hain.`;
            }

            return NextResponse.json({
                success: true,
                reply: fallbackReply,
                userTranscript: userTranscript || undefined,
                actionType: q.includes("seat") || q.includes("book") ? "BOOK_SEAT" : "GENERAL",
                userName: user?.name || "Student",
            });
        }

        // Call Google Gemini API (gemini-flash-latest)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
        
        const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemInstruction }]
                },
                contents,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 250,
                    topP: 0.9,
                }
            })
        });

        const geminiData = await geminiRes.json();

        if (geminiData.error) {
            console.error("Gemini API error in route:", geminiData.error);
            // Fallback smart response if rate limit or network glitch
            const fallbackReply = `Namaste! Sameer Library me monthly fee abhi ₹${effectivePrice} hai aur AC rooms me seats available hain. Wi-Fi aur RO water ki suvidha uplabdh hai. Aap app ke Book tab se turant seat book kar sakte hain.`;
            return NextResponse.json({
                success: true,
                reply: fallbackReply,
                fallback: true,
            });
        }

        const replyRaw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
        let reply = "";
        let userTranscript = "";

        if (audioBase64) {
            if (replyRaw.includes("TRANSCRIPT:") && replyRaw.includes("ANSWER:")) {
                const parts = replyRaw.split("ANSWER:");
                userTranscript = parts[0].replace("TRANSCRIPT:", "").trim();
                reply = parts[1].trim();
            } else if (replyRaw.includes("ANSWER:")) {
                const answerIdx = replyRaw.indexOf("ANSWER:");
                reply = replyRaw.substring(answerIdx + 7).trim();
                userTranscript = "Voice query";
            } else {
                reply = replyRaw || "Namaste! Main aapki aawaz samajh gaya hoon.";
                userTranscript = "Voice audio";
            }
        } else {
            reply = replyRaw || `Namaste! Sameer Library me aapka swagat hai. Aap library timing, fees ya seat booking ke bare me puch sakte hain.`;
        }

        reply = reply.replace(/\*\*/g, '').replace(/###/g, '').replace(/[\*•]/g, '').trim();

        // Action recommendation chips (e.g. for CTAs)
        const actionType = reply.toLowerCase().includes("book") || reply.toLowerCase().includes("seat")
            ? "BOOK_SEAT"
            : reply.toLowerCase().includes("due") || reply.toLowerCase().includes("pay")
            ? "PAY_DUES"
            : "GENERAL";

        return NextResponse.json({
            success: true,
            reply,
            userTranscript: userTranscript || undefined,
            actionType,
            userName: user?.name || "Student",
        });

    } catch (error: any) {
        console.error("AI Chat API handler error:", error);
        return NextResponse.json({
            success: false,
            error: error?.message || "Internal server error"
        }, { status: 500 });
    }
}
