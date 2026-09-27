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
        let myBooking: any = null;
        let todayAttendance: any = null;
        let totalDuesAgg: any = { _sum: { dueAmount: 0, paidAmount: 0 } };
        let pendingApprovalsCount = 0;
        let todayAttendanceCount = 0;

        if (user && (user.role === "STUDENT" || mode === "STUDENT")) {
            try {
                myBooking = await prisma.booking.findFirst({
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

                todayAttendance = await prisma.attendance.findFirst({
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
                totalDuesAgg = await prisma.booking.aggregate({
                    where: { status: "APPROVED" },
                    _sum: { dueAmount: true, paidAmount: true }
                });

                pendingApprovalsCount = await prisma.booking.count({
                    where: { status: "PENDING" }
                });

                todayAttendanceCount = await prisma.attendance.count({
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
- Total Fees Collected: ₹${totalDuesAgg._sum?.paidAmount || 0}
- Total Pending Dues Across Library: ₹${totalDuesAgg._sum?.dueAmount || 0}
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

        // Function to produce rich, dynamic, context-aware responses from live database facts
        const generateSmartDynamicReply = (queryText: string, isVoiceAudio: boolean) => {
            const q = (queryText || "").toLowerCase().trim();

            // --- ADMIN / OWNER INTENTS ---
            if (user && (user.role === "ADMIN" || user.role === "OWNER" || mode === "ADMIN")) {
                if (q.includes("attendance") || q.includes("aaye") || q.includes("present") || q.includes("bache") || q.includes("aaj")) {
                    return {
                        reply: `Sir, aaj library me kul ${todayAttendanceCount} students ne attendance punch kiya hai.`,
                        actionType: "GENERAL"
                    };
                }
                if (q.includes("due") || q.includes("baki") || q.includes("recovery") || q.includes("pending fee")) {
                    return {
                        reply: `Sir, library ke sabhi active students ka kul pending due balance ₹${totalDuesAgg._sum.dueAmount || 0} hai. Total collection ₹${totalDuesAgg._sum.paidAmount || 0} ho chuka hai.`,
                        actionType: "PAY_DUES"
                    };
                }
                if (q.includes("admission") || q.includes("approval") || q.includes("request") || q.includes("pending")) {
                    return {
                        reply: `Sir, abhi ${pendingApprovalsCount} new seat booking requests admin approval ke liye pending hain.`,
                        actionType: "GENERAL"
                    };
                }
                if (q.includes("seat") || q.includes("khali") || q.includes("vacant") || q.includes("capacity")) {
                    return {
                        reply: `Sir, kul capacity ${totalSeats} seats ki hai, jisme se lagbhag ${availableSeatsEstimate} seats abhi khali hain aur ${activeBookingsCount} active admissions hain.`,
                        actionType: "BOOK_SEAT"
                    };
                }
                if (q.includes("revenue") || q.includes("collection") || q.includes("kamai") || q.includes("paisa")) {
                    return {
                        reply: `Sir, ab tak kul ₹${totalDuesAgg._sum.paidAmount || 0} fee collect hui hai aur ₹${totalDuesAgg._sum.dueAmount || 0} dues pending hain.`,
                        actionType: "GENERAL"
                    };
                }
            }

            // --- STUDENT SPECIFIC INTENTS ---
            if (user && (user.role === "STUDENT" || mode === "STUDENT")) {
                if (q.includes("seat") || q.includes("number") || q.includes("mera seat") || q.includes("kaha")) {
                    if (myBooking?.seat) {
                        return {
                            reply: `${user.name} ji, aapki reserved seat ${myBooking.room?.name || "Main AC Hall"} me Seat Number ${myBooking.seat.seatNumber} hai (${myBooking.branch?.name || "Main Branch"}).`,
                            actionType: "BOOK_SEAT"
                        };
                    } else {
                        return {
                            reply: `${user.name} ji, abhi aapka koi approved seat active nahi hai. Aap Book tab se nayi seat chun sakte hain.`,
                            actionType: "BOOK_SEAT"
                        };
                    }
                }
                if (q.includes("due") || q.includes("fee") || q.includes("baki") || q.includes("balance") || q.includes("paisa")) {
                    if (myBooking) {
                        if (myBooking.dueAmount > 0) {
                            return {
                                reply: `${user.name} ji, aapka ₹${myBooking.dueAmount} pending due balance hai. Aapne ₹${myBooking.paidAmount} jama kiya hai. Kripya counter par ya online pay karein.`,
                                actionType: "PAY_DUES"
                            };
                        } else {
                            return {
                                reply: `Badhai ho ${user.name} ji! Aapka koi pending due nahi hai. Aapki monthly fees fully paid hai.`,
                                actionType: "GENERAL"
                            };
                        }
                    }
                }
                if (q.includes("valid") || q.includes("expiry") || q.includes("kab tak") || q.includes("date")) {
                    if (myBooking?.endDate) {
                        const dateStr = new Date(myBooking.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                        return {
                            reply: `${user.name} ji, aapki library membership ${dateStr} tak valid hai.`,
                            actionType: "GENERAL"
                        };
                    }
                }
                if (q.includes("attendance") || q.includes("punch") || q.includes("aaj") || q.includes("haziri")) {
                    if (todayAttendance) {
                        const inTime = new Date(todayAttendance.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                        const outTime = todayAttendance.checkOutAt ? new Date(todayAttendance.checkOutAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
                        return {
                            reply: `${user.name} ji, aaj aapki attendance marked hai! Check-in: ${inTime}${outTime ? `, Check-out: ${outTime}` : " (Active inside library)"}.`,
                            actionType: "GENERAL"
                        };
                    } else {
                        return {
                            reply: `${user.name} ji, aaj aapne abhi tak attendance punch nahi kiya hai. Entrance Gate QR scan karke attendance mark kar lein.`,
                            actionType: "GENERAL"
                        };
                    }
                }
            }

            // --- GENERAL / PUBLIC INQUIRY INTENTS ---
            if (q.includes("fee") || q.includes("price") || q.includes("charge") || q.includes("kitna") || q.includes("discount") || q.includes("rate")) {
                const discountText = pricing.discountActive ? ` (Special discount offer chal raha hai: ${pricing.discountPercent}% OFF!)` : "";
                return {
                    reply: `Sameer Library me monthly fee ₹${effectivePrice} per month hai${discountText}. Isme AC study hall, 5G Wi-Fi aur RO drinking water shaamil hai.`,
                    actionType: "BOOK_SEAT"
                };
            }
            if (q.includes("seat") || q.includes("khali") || q.includes("available") || q.includes("room")) {
                return {
                    reply: `Sameer Library me abhi lagbhag ${availableSeatsEstimate} seats uplabdh hain. Sabhi seats par comfortable cushion chairs aur laptop charging sockets diye gaye hain.`,
                    actionType: "BOOK_SEAT"
                };
            }
            if (q.includes("wifi") || q.includes("internet") || q.includes("password") || q.includes("speed")) {
                return {
                    reply: `Sameer Library me high-speed 5G optical fiber Wi-Fi sabhi enrolled students ke liye bilkul free uplabdh hai. Counter se Wi-Fi connect kar sakte hain.`,
                    actionType: "GENERAL"
                };
            }
            if (q.includes("time") || q.includes("timing") || q.includes("shift") || q.includes("khulta") || q.includes("band")) {
                return {
                    reply: `Sameer Library me 3 shifts hain: Morning (8:00 AM to 2:00 PM), Evening (2:00 PM to 8:00 PM) aur Full Day (8:00 AM to 10:00 PM). Sunday ko bhi open rehti hai.`,
                    actionType: "GENERAL"
                };
            }
            if (q.includes("facility") || q.includes("suvidha") || q.includes("ac") || q.includes("ro") || q.includes("power") || q.includes("inverter")) {
                return {
                    reply: `Library me Silent AC Rooms, Inverter/Generator Power Backup, 5G Wi-Fi, RO Water, Personal Charging Points, Separate Washrooms aur 24x7 CCTV security uplabdh hai.`,
                    actionType: "GENERAL"
                };
            }
            if (q.includes("rule") || q.includes("niyam") || q.includes("discipline") || q.includes("khana") || q.includes("phone")) {
                return {
                    reply: `Library ke niyam: Reading hall me pin-drop silence banaye rakhein, mobile silent mode par rakhein aur lunch sirf designated break zone me karein.`,
                    actionType: "GENERAL"
                };
            }
            if (q.includes("book") || q.includes("admission") || q.includes("join") || q.includes("kaise") || q.includes("register")) {
                return {
                    reply: `Admission lene ke liye app me 'Book Seat' par jayein, branch aur manpasand seat select karein aur form submit karein. Admin turant seat approve kar dega.`,
                    actionType: "BOOK_SEAT"
                };
            }
            if (q.includes("branch") || q.includes("address") || q.includes("kaha") || q.includes("location") || q.includes("patna")) {
                return {
                    reply: `Sameer Library ki branches: ${branches.map(b => `${b.name} (${b.address || b.city})`).join(", ") || "Main Branch"}. Kisi bhi branch me visit kar sakte hain.`,
                    actionType: "GENERAL"
                };
            }
            if (q.includes("exam") || q.includes("upsc") || q.includes("bpsc") || q.includes("ssc") || q.includes("neet") || q.includes("jee") || q.includes("padhai") || q.includes("focus")) {
                return {
                    reply: `Sameer Library competitive exams ki taiyari ke liye best shaant vatavaran deta hai. Daily routine aur regular self-study se safalta zaroor milegi! All the best!`,
                    actionType: "GENERAL"
                };
            }

            // Default warm welcome response
            if (user && (user.role === "STUDENT" || mode === "STUDENT")) {
                return {
                    reply: `Namaste ${user.name} ji! Main Sameer AI hoon. Aap apni seat, pending fee, valid date ya library rules ke bare me mujhse puch sakte hain.`,
                    actionType: "GENERAL"
                };
            }
            if (user && (user.role === "ADMIN" || mode === "ADMIN")) {
                return {
                    reply: `Namaste Admin Sir! Aaj ${todayAttendanceCount} students present hain aur ₹${totalDuesAgg._sum.dueAmount || 0} dues pending hain. Main kis audit me madad karu?`,
                    actionType: "GENERAL"
                };
            }
            return {
                reply: `Namaste! Sameer Library me aapka swagat hai. Hamare yahan monthly fee ₹${effectivePrice} hai aur ${availableSeatsEstimate} seats uplabdh hain. AC silent rooms aur 5G Wi-Fi ki suvidha uplabdh hai.`,
                actionType: "BOOK_SEAT"
            };
        };

        // Check if Gemini API key is valid (Google AI Studio keys start with AIzaSy)
        const isKeyValid = apiKey && typeof apiKey === "string" && apiKey.startsWith("AIzaSy") && apiKey.length > 25;

        // If no valid Gemini API key is configured, use our intelligent database-grounded engine
        if (!isKeyValid) {
            const resolved = generateSmartDynamicReply(message || (audioBase64 ? "voice inquiry" : ""), !!audioBase64);
            return NextResponse.json({
                success: true,
                reply: resolved.reply,
                userTranscript: audioBase64 ? (message || "Aapka voice sawal") : message,
                actionType: resolved.actionType,
                userName: user?.name || "Student",
                mode: "dynamic_db_engine",
            });
        }

        // Call Google Gemini API (tries 2.0 Flash then 1.5 Flash) with fallback to Smart Engine
        const modelsToTry = [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
        ];

        let geminiData: any = null;
        let successfulModel = "";

        for (const modelName of modelsToTry) {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 6500);

                const geminiRes = await fetch(geminiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: controller.signal,
                    body: JSON.stringify({
                        system_instruction: {
                            parts: [{ text: systemInstruction }]
                        },
                        contents,
                        generationConfig: {
                            temperature: 0.4,
                            maxOutputTokens: 150,
                            topP: 0.85,
                        }
                    })
                });
                clearTimeout(timeoutId);
                const data = await geminiRes.json();
                if (data && !data.error && data.candidates?.[0]?.content?.parts) {
                    geminiData = data;
                    successfulModel = modelName;
                    break;
                } else if (data?.error) {
                    console.warn(`Gemini ${modelName} returned error:`, data.error?.message);
                }
            } catch (err: any) {
                console.warn(`Gemini ${modelName} call exception:`, err?.message);
            }
        }

        // If Gemini API fails or runs out of quota, fallback to our Smart Dynamic DB Engine
        if (!geminiData || geminiData.error) {
            console.warn("Gemini API not responding, using Smart Dynamic DB Engine fallback");
            const resolved = generateSmartDynamicReply(message || "", !!audioBase64);
            return NextResponse.json({
                success: true,
                reply: resolved.reply,
                userTranscript: audioBase64 ? "Voice audio" : message,
                actionType: resolved.actionType,
                userName: user?.name || "Student",
                fallback: true,
            });
        }

        const candidateParts = geminiData.candidates?.[0]?.content?.parts || [];
        const replyRaw = candidateParts
            .map((p: any) => p.text || "")
            .filter(Boolean)
            .join("\n")
            .trim();
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
            modelUsed: successfulModel,
        });

    } catch (error: any) {
        console.error("AI Chat API handler error:", error);
        return NextResponse.json({
            success: false,
            error: error?.message || "Internal server error"
        }, { status: 500 });
    }
}
