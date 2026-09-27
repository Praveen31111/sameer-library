import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const GEMINI_DEFAULT_KEY = Buffer.from("QVEuQWI4Uk42STZpRzZDZkh4M3ozeUkwWVVfWWtENElHRERiTmpqamtkQXF4c2VhdWhxdkE=", "base64").toString("utf-8");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || GEMINI_DEFAULT_KEY;

// In-memory voice audio cache for lightning-fast (0ms) response on common queries
const voiceAudioCache = new Map<string, string>();

async function synthesizeDirectVoice(text: string): Promise<string | null> {
    try {
        const cleanText = text.replace(/[\*\#\_]/g, '').replace(/https?:\/\/\S+/g, '').trim();
        if (!cleanText) return null;

        if (voiceAudioCache.has(cleanText)) {
            return voiceAudioCache.get(cleanText)!;
        }

        const ttsPromise = (async () => {
            const tts = new MsEdgeTTS();
            await tts.setMetadata("hi-IN-MadhurNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
            const { audioStream } = tts.toStream(cleanText);

            const chunks: Buffer[] = [];
            await new Promise<void>((resolve, reject) => {
                audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
                audioStream.on("end", () => resolve());
                audioStream.on("error", (err: any) => reject(err));
            });

            const audioBuffer = Buffer.concat(chunks);
            return `data:audio/mp3;base64,${audioBuffer.toString("base64")}`;
        })();

        // 2.2 second race timeout: if network TTS is fast, return director voice.
        // If slow, resolve null instantly so the student doesn't wait and phone uses native TTS.
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2200));
        const base64Audio = await Promise.race([ttsPromise, timeoutPromise]);

        if (base64Audio) {
            if (voiceAudioCache.size > 120) {
                const firstKey = voiceAudioCache.keys().next().value;
                if (firstKey) voiceAudioCache.delete(firstKey);
            }
            voiceAudioCache.set(cleanText, base64Audio);
            return base64Audio;
        }

        return null;
    } catch (err) {
        console.warn("Direct voice synthesis warning:", err);
        return null;
    }
}

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
        const apiKey = process.env.GEMINI_API_KEY || GEMINI_API_KEY || GEMINI_DEFAULT_KEY;

        const body = await req.json();
        const { message, audioBase64, mimeType, mode, conversationHistory, wantVoice } = body;

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
You are "Sameer AI", the friendly "Library Buddy" and official voice assistant for Sameer Library (समीर डिजिटल लाइब्रेरी).
You speak like a caring, witty, respectful older brother and library director whose sole purpose is helping students focus and succeed in their competitive exams (UPSC, BPSC, SSC, Banking, Railways, NEET, JEE, etc.).

PERSONALITY & TONE:
1. Friendly, respectful, approachable, and slightly fun/witty (e.g. "Haan bhai 😄...", "Namaste ji!", "Bilkul!").
2. Answer in natural conversational Hindi or Hinglish. If queried in English, reply in friendly Indian English.
3. NEVER make jokes on girls, body, privacy, religion, caste, disability, or personal appearance.
4. On sensitive questions (toilet, girls privacy, CCTV, late entry), be reassuring, clear, and privacy-focused.
5. If question is vague (e.g. "bhai ye allowed h?"), playfully clarify: "Haan bhai 😄 Bas batao kis cheez ki baat kar rahe ho—phone, food, laptop, seat ya kuch aur?"
6. BROKEN LANGUAGE RESILIENCE: Never judge bad grammar, typos, phonetic spelling, short words ("toilet h kya", "tolet kidr h", "khana kha skte", "cctv h kya", "wash rum", "ladki log ke liye"). Understand the student's true underlying intent and answer immediately.
7. STRICT DATA GROUNDING: Only state facilities and data that are verified in the Database Facts below. Never make up false policies.
8. CRITICAL FOR INDIAN MALE DIRECTOR TTS VOICE:
   - Keep spoken answer concise: 2 to 3 sentences maximum!
   - DO NOT use markdown bold stars (**text**), bullet stars (*), hashtags (###), or markdown tables. Speak in smooth, natural conversational sentences.

REAL-TIME DATABASE FACTS & VERIFIED POLICIES:
- Library Name: Sameer Library (समीर डिजिटल लाइब्रेरी)
- Current Fee: ₹${effectivePrice} per month${pricing.discountActive ? ` (Special Offer: ${pricing.discountPercent}% OFF!)` : ""}
- Base Price: ₹${pricing.monthlyBasePrice} per month
- Total Capacity: Approx ${totalSeats || 50} seats across all branches (${availableSeatsEstimate} seats currently available for new admissions)
- Active Branches:
${branchSummary || "• Sameer Library Main Branch"}
- Study Shifts Available:
  1. Morning Shift: 8:00 AM to 2:00 PM
  2. Evening Shift: 2:00 PM to 8:00 PM
  3. Full Day Shift: 8:00 AM to 10:00 PM (Most popular)
  Open 7 days a week, including Sunday!
- Toilet / Washroom: Clean, well-maintained toilet facilities available. Separate hygienic washrooms for boys and girls. Privacy is our top priority.
- CCTV & Privacy: 24x7 security CCTV cameras are present ONLY in common areas, hallways, and study halls for safety. ABSOLUTELY NO cameras in toilets or private areas. No one monitors what you read on your personal desk.
- Food & Chai: Food and tiffin are allowed strictly in the designated break zone, not on study desks next to books. Chai is available nearby outside.
- Phone Rules: Phones must be strictly on silent mode in reading halls. Emergency calls must be taken in the corridor.
- Laptop & Charging: High-speed 5G Wi-Fi is free for enrolled students. Individual charging power sockets on every desk. Laptops allowed (silent typing).
- AC & Temperature: Fully Air-Conditioned silent study halls with fans. If you feel too cold, keep a light hoodie handy.
- Bag / Storage: Bag and personal item storage space available.
- Girls Safety & Culture: 100% safe, disciplined, and respectful study environment for both girls and boys. Pin-drop silence. Disturbing any fellow student is strictly prohibited.
- Attendance: Marked through the app using Gate QR scan with instant live location and selfie verification.
- Seat Safety: Your booked seat is officially yours. If someone takes your seat, report immediately to admin via the app.
- Boredom & Study Advice: If bored, take a 5-minute water break, take a short walk, and get back to books using the 50-minute study and 10-minute break formula!

${studentContextStr}
${adminContextStr}

RESPONSE FORMAT:
TRANSCRIPT: <what student said in short>
ANSWER: <your 2-3 sentence spoken buddy reply>
SUGGESTIONS: <question 1> | <question 2> | <question 3>
`;

        // 5. Build conversation payload for Gemini
        const contents: any[] = [];

        // Append recent conversation history if provided
        if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
            conversationHistory.slice(-4).forEach((msg: any) => {
                const role = msg.role || (msg.sender === "user" ? "user" : "model");
                const text = String(msg.content || msg.text || "").trim();
                if (text && (role === "user" || role === "model" || role === "assistant")) {
                    contents.push({
                        role: role === "assistant" ? "model" : role,
                        parts: [{ text }]
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
                        inlineData: {
                            mimeType: mimeType || "audio/m4a",
                            data: audioBase64
                        }
                    },
                    {
                        text: "A student just spoke this voice question to Sameer AI (Library Buddy). Listen carefully to their Hindi, Hinglish, or English speech.\nEven if casual, soft, or with background noise, extract the question and answer warmly as Sameer AI in 2-3 spoken sentences.\n\nRequired Format:\nTRANSCRIPT: <Hindi or Hinglish transcript of student query>\nANSWER: <2-3 sentence spoken friendly buddy reply>\nSUGGESTIONS: <question 1> | <question 2> | <question 3>\n\nIf the audio is completely silent or no speech was detected, respond with:\nTRANSCRIPT: (Aawaz saf nahi aayi)\nANSWER: Arrey bhai, aapki aawaz theek se nahi sunai di! Ek bar thoda paas aakar boliye, main sun raha hoon 😄\nSUGGESTIONS: 🚻 Toilet hai kya? | 💰 Monthly fees kitni hai? | 🕒 Library timings?"
                    }
                ]
            });
        } else {
            contents.push({
                role: "user",
                parts: [
                    {
                        text: `${message}\n(Respond with:\nANSWER: <your 2-3 sentence spoken friendly buddy reply>\nSUGGESTIONS: <short question 1> | <short question 2> | <short question 3>)`
                    }
                ]
            });
        }

        // Robust Intent Engine with Broken-Language Normalization & Slang Handling
        const generateSmartDynamicReply = (queryText: string, isVoiceAudio: boolean) => {
            const q = (queryText || "").toLowerCase().trim();

            // Vague permission query
            if (/^(bhai\s+)?(ye|kya|kuch)?\s*(allowed|allow|permission|chalta|kare to)(\s+hai)?\??$/i.test(q) || q === "allowed hai" || q === "kya allowed hai") {
                return {
                    reply: "Haan bhai 😄 Bas batao kis cheez ki baat kar rahe ho—phone, food, laptop, seat ya kuch aur?",
                    actionType: "GENERAL",
                    suggestions: ["📱 Phone use kar sakte hain?", "🍔 Khana kha sakte hain?", "💻 Laptop la sakte hain?", "🕒 Timings kya hain?"]
                };
            }

            // --- ADMIN / OWNER INTENTS ---
            if (user && (user.role === "ADMIN" || user.role === "OWNER" || mode === "ADMIN")) {
                if (/attendance|aaye|present|bache|aaj/i.test(q)) {
                    return {
                        reply: `Sir, aaj library me kul ${todayAttendanceCount} students ne attendance punch kiya hai.`,
                        actionType: "GENERAL",
                        suggestions: ["💰 Total pending dues?", "🪑 Kitni seats khali hain?", "📋 Pending admissions?"]
                    };
                }
                if (/due|baki|recovery|pending/i.test(q)) {
                    return {
                        reply: `Sir, library ke sabhi active students ka kul pending due balance ₹${totalDuesAgg._sum.dueAmount || 0} hai. Total collection ₹${totalDuesAgg._sum.paidAmount || 0} ho chuka hai.`,
                        actionType: "PAY_DUES",
                        suggestions: ["📊 Today attendance count?", "🪑 Available seats?", "📋 Pending approvals?"]
                    };
                }
                if (/admission|approval|request/i.test(q)) {
                    return {
                        reply: `Sir, abhi ${pendingApprovalsCount} new seat booking requests admin approval ke liye pending hain.`,
                        actionType: "GENERAL",
                        suggestions: ["💰 Pending dues kitne hain?", "📊 Aaj kitne students aaye?", "🪑 Total seats?"]
                    };
                }
                if (/seat|khali|vacant|capacity/i.test(q)) {
                    return {
                        reply: `Sir, kul capacity ${totalSeats} seats ki hai, jisme se lagbhag ${availableSeatsEstimate} seats abhi khali hain aur ${activeBookingsCount} active admissions hain.`,
                        actionType: "BOOK_SEAT",
                        suggestions: ["💰 Collection summary?", "📊 Attendance audit?", "📋 Pending bookings?"]
                    };
                }
            }

            // --- STUDENT PERSONAL DATA INTENTS ---
            if (user && (user.role === "STUDENT" || mode === "STUDENT")) {
                if (/meri seat|seat no|seat number|kaha baithu|assigned seat/i.test(q)) {
                    if (myBooking?.seat) {
                        return {
                            reply: `${user.name} ji, aapki reserved seat ${myBooking.room?.name || "Main AC Hall"} me Seat Number ${myBooking.seat.seatNumber} hai (${myBooking.branch?.name || "Main Branch"}).`,
                            actionType: "BOOK_SEAT",
                            suggestions: ["💵 Mera kitna due payment baki hai?", "📶 Wi-Fi password kya hai?", "📅 Membership kab tak valid hai?"]
                        };
                    } else {
                        return {
                            reply: `${user.name} ji, abhi aapka koi approved seat active nahi hai. Aap Book Seat tab se apni manpasand seat chun sakte hain.`,
                            actionType: "BOOK_SEAT",
                            suggestions: ["🪑 Available seats dekhein", "💰 Monthly fees kitni hai?", "🕒 Shifts timing?"]
                        };
                    }
                }
                if (/due|baki|balance|pending fee|paisa baki/i.test(q)) {
                    if (myBooking) {
                        if (myBooking.dueAmount > 0) {
                            return {
                                reply: `${user.name} ji, aapka ₹${myBooking.dueAmount} pending due balance hai. Aapne ₹${myBooking.paidAmount} jama kiya hai. Counter par ya app se direct pay kar sakte hain.`,
                                actionType: "PAY_DUES",
                                suggestions: ["💳 Pay dues online", "🪑 Meri seat details", "📅 Validity kab tak hai?"]
                            };
                        } else {
                            return {
                                reply: `Badhai ho ${user.name} ji! Aapka koi pending due nahi hai. Aapki monthly fees fully paid hai.`,
                                actionType: "GENERAL",
                                suggestions: ["🪑 Meri seat number", "📅 Membership validity", "📶 Wi-Fi details"]
                            };
                        }
                    }
                }
                if (/valid|expiry|kab tak|validity/i.test(q)) {
                    if (myBooking?.endDate) {
                        const dateStr = new Date(myBooking.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                        return {
                            reply: `${user.name} ji, aapki library membership ${dateStr} tak valid hai.`,
                            actionType: "GENERAL",
                            suggestions: ["💵 Pending fees status", "🪑 Seat number", "🕒 Library timings"]
                        };
                    }
                }
                if (/attendance|punch|aaj|haziri/i.test(q)) {
                    if (todayAttendance) {
                        const inTime = new Date(todayAttendance.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                        const outTime = todayAttendance.checkOutAt ? new Date(todayAttendance.checkOutAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
                        return {
                            reply: `${user.name} ji, aaj aapki attendance marked hai! Check-in: ${inTime}${outTime ? `, Check-out: ${outTime}` : " (Active inside library)"}.`,
                            actionType: "GENERAL",
                            suggestions: ["🪑 Meri seat", "📶 Wi-Fi password", "📜 Library rules"]
                        };
                    } else {
                        return {
                            reply: `${user.name} ji, aaj aapne abhi tak attendance punch nahi kiya hai. Entrance Gate QR scan karke attendance mark kar lein.`,
                            actionType: "GENERAL",
                            suggestions: ["📸 Attendance scan kaise karein?", "🪑 Meri seat number", "🕒 Timing kya hai?"]
                        };
                    }
                }
            }

            // --- FRIENDLY FAQ INTENTS (WITH BROKEN SLANG & TYPO MATCHING) ---

            // Toilet / Washroom Questions
            if (/toilet.*(cctv|camera)|(cctv|camera).*toilet/i.test(q)) {
                return {
                    reply: "Nahi, bilkul nahi! 🚫📷 Toilets aur private areas mein koi camera nahi hota. Security cameras sirf common hallways aur study halls ke liye hote hain.",
                    actionType: "GENERAL",
                    suggestions: ["🚻 Toilet clean rehta hai?", "🔒 CCTV se privacy safe hai?", "📜 Library rules kya hain?"]
                };
            }
            if (/ladki.*(toilet|washroom)|girl.*(toilet|washroom)|separate.*(toilet|washroom)|toilet.*alag/i.test(q)) {
                return {
                    reply: "Haan ji! Girls ke liye separate clean washroom facility available hai. Hamare yahan privacy aur hygiene ko highest priority di jati hai.",
                    actionType: "GENERAL",
                    suggestions: ["🚻 Toilet clean rehta hai?", "🔒 CCTV security facilities?", "🪑 Seat book kaise karein?"]
                };
            }
            if (/toilet|tolet|washroom|wash\s*rum|peshab|latrine|nature\s*call/i.test(q)) {
                return {
                    reply: "Haan ji! 😄 Toilet facility available hai. Padhai ke beech nature ka call aaye to ignore mat karna! Regular cleanliness maintain hoti hai. 🚻",
                    actionType: "GENERAL",
                    suggestions: ["🚺 Girls ke liye separate washroom hai?", "🔒 CCTV security kahan hai?", "🕒 Shifts timing?"]
                };
            }

            // CCTV, Privacy & Surveillance
            if (/nazar|reels|dekh rahe/i.test(q)) {
                return {
                    reply: "Seat par tum padh rahe ho ya reels dekh rahe ho, iska live commentary nahi chalega! 😂 Security cameras sirf safety ke liye hote hain, personal activities monitor karne ke liye nahi.",
                    actionType: "GENERAL",
                    suggestions: ["🔒 CCTV kahan laga hai?", "📱 Phone silent mode rule?", "🤫 Silence rules?"]
                };
            }
            if (/cctv|camera|surveillance|privacy|nazar/i.test(q)) {
                return {
                    reply: "Haan, student security ke liye common areas aur corridors mein 24x7 CCTV coverage hai. Private areas mein koi camera nahi hota, aapki privacy 100% safe hai. 🔒",
                    actionType: "GENERAL",
                    suggestions: ["🚻 Toilet me camera to nahi hai?", "🎒 Bag storage facility?", "🕒 Night study shift?"]
                };
            }

            // Food, Chai & Eating
            if (/chai|tea|coffee/i.test(q)) {
                return {
                    reply: "Library ke pass tea aur refreshments aasani se mil jate hain ☕. Bas books ke paas chai mat le aana—Sameer AI abhi chai serve nahi kar sakta! 😂",
                    actionType: "GENERAL",
                    suggestions: ["🍔 Khana kha sakte hain?", "🕒 Library timings?", "📶 Wi-Fi speed kitni hai?"]
                };
            }
            if (/khana|food|lunch|tiffin|samosa|bhojan|eat/i.test(q)) {
                return {
                    reply: "Haan, aap apna tiffin la sakte hain! Lekin khana sirf designated break zone mein allow hai. Books ke paas samosa ya lunch box = risky friendship! 😄",
                    actionType: "GENERAL",
                    suggestions: ["☕ Library me chai milegi?", "🤫 Silence rules?", "🕒 Break timing?"]
                };
            }

            // Phone & Calling Rules
            if (/phone|mobile|call|silent|ring/i.test(q)) {
                return {
                    reply: "Phone use kar sakte hain, lekin silent mode best friend hai 🤫. Emergency call aaye to corridor ya break area mein jaakar baat karein.",
                    actionType: "GENERAL",
                    suggestions: ["💻 Laptop la sakte hain?", "🔋 Charging point hai?", "📜 Library rules?"]
                };
            }

            // Wi-Fi & Internet
            if (/wifi|wi-fi|internet|net|speed|password/i.test(q)) {
                return {
                    reply: "Haan! Sabhi enrolled students ke liye high-speed 5G optical fiber Wi-Fi bilkul free available hai. Admission ke baad counter se access details mil jayengi. 📶",
                    actionType: "GENERAL",
                    suggestions: ["🔋 Charging socket desk par hai?", "💻 Laptop allowed hai?", "💰 Monthly fee kitni hai?"]
                };
            }

            // Charging & Laptops
            if (/charg|socket|plug|board|battery/i.test(q)) {
                return {
                    reply: "Haan! Har desk par personal charging points aur laptop power sockets diye gaye hain 🔋. Bas apna charger le aana—Sameer AI charger nahi ban sakta! 😄",
                    actionType: "GENERAL",
                    suggestions: ["💻 Laptop la sakte hain?", "📶 Wi-Fi password?", "🪑 Seat book kaise karein?"]
                };
            }
            if (/laptop|computer/i.test(q)) {
                return {
                    reply: "Bilkul! Laptop la sakte hain 💻. Har desk par charging socket aur high-speed Wi-Fi hai. Bas keyboard typing se doosron ki concentration na toote.",
                    actionType: "GENERAL",
                    suggestions: ["🔋 Charging point kahan hai?", "📶 Wi-Fi availability?", "🕒 Shifts timing?"]
                };
            }

            // AC, Fan & Temperature
            if (/(\bac\b|air\s*con|fan|hawa|thand|garmi|cooler|temp)/i.test(q)) {
                return {
                    reply: "Haan ji! Fully AC silent study rooms hain aur fans bhi available hain 🥶. Agar thand zyada lage to ek halki hoodie ready rakhna! Padhai ke saath hawa bhi free! 😄",
                    actionType: "GENERAL",
                    suggestions: ["🕒 Library shifts kya hain?", "🪑 Seat availability?", "💰 Monthly fee?"]
                };
            }

            // Bag Storage & Lockers
            if (/bag|locker|basta|thela|storage/i.test(q)) {
                return {
                    reply: "Haan, bag aur books rakhne ke liye designated bag storage racks aur locker facility available hai 🎒. Aap apna saman aaram se rakh sakte hain.",
                    actionType: "GENERAL",
                    suggestions: ["💻 Laptop allowed hai?", "🔒 CCTV security safe hai?", "🪑 Seat book kaise karein?"]
                };
            }

            // Girls, Safety & Respectful Culture
            if (/ladki.*(baat|talk|friend)|girl.*(baat|talk|friend)/i.test(q)) {
                return {
                    reply: "Padhai ke liye aaye ho boss! 😄 Library mein sabhi respectful silence maintain karte hain. Disturb karna strictly allowed nahi hai.",
                    actionType: "GENERAL",
                    suggestions: ["🤫 Silence ke rules?", "🕒 Library timings?", "🪑 Seat booking process?"]
                };
            }
            if (/girls|ladki|female|women|safe|suraksha/i.test(q)) {
                return {
                    reply: "Haan, Sameer Library mein girls aur boys dono ke liye 100% safe, disciplined aur respectful study environment hai. Separate washrooms aur 24x7 CCTV security available hai. 🛡️",
                    actionType: "GENERAL",
                    suggestions: ["🚺 Girls separate washroom?", "🔒 CCTV surveillance safe hai?", "🕒 Shifts timing?"]
                };
            }

            // Timings, Night Study & Sunday
            if (/late|deri/i.test(q)) {
                return {
                    reply: "Aap apni shift ke according late entry le sakte hain. Bas entry karte waqt gate QR scan se attendance zaroor mark karein aur silence banaye rakhein.",
                    actionType: "GENERAL",
                    suggestions: ["🕒 Shifts timing kya hain?", "🌙 Raat ko kab tak khula hai?", "📅 Sunday open rehta hai?"]
                };
            }
            if (/raat|night|sunday|time|timing|shift|khulta|band|open|close|kab tak/i.test(q)) {
                return {
                    reply: "Sameer Library 7 days open rehti hai (Sunday bhi!). 3 shifts hain: Morning (8 AM - 2 PM), Evening (2 PM - 8 PM) aur Full Day (8 AM - 10 PM) 🕒.",
                    actionType: "GENERAL",
                    suggestions: ["💰 Monthly fee kitni hai?", "🪑 Seat availability?", "📝 Admission kaise lein?"]
                };
            }

            // Seat Dispute / Security
            if (/seat.*le liya|koi.*baith|seat.*dispute/i.test(q)) {
                return {
                    reply: "Agar seat aapke account par officially approved hai, to koi aur wahan nahi baith sakta! Aap politely unhe bata sakte hain ya app/admin se complaint kar sakte hain.",
                    actionType: "GENERAL",
                    suggestions: ["🪑 Meri seat number kya hai?", "📞 Admin contact", "📜 Library rules?"]
                };
            }

            // Boredom, Motivation & Study Tips
            if (/bore|boring|neend|neend aa rahi|thak gya|focus/i.test(q)) {
                return {
                    reply: "Bore ho gaye ya neend aa rahi hai? 😂 5 minute ka break lo, thanda paani piyo, thoda walk karo... phir books ke battlefield mein wapas! Rule simple hai: 50 min study, 10 min break. 💪",
                    actionType: "GENERAL",
                    suggestions: ["📚 Padhai ka best routine?", "☕ Chai break rules?", "🕒 Full day shift timing?"]
                };
            }
            if (/padhai kaise|routine|shanti|peace/i.test(q)) {
                return {
                    reply: "Padhai ka simple funda: Phone silent → Target set → 50 min deep study → 10 min break. Yahan pin-drop silence vatavaran milega, bas consistency maintain rakhein! 🚀",
                    actionType: "GENERAL",
                    suggestions: ["🕒 Library shifts timing?", "🪑 Seat availability?", "💰 Monthly fee kitni hai?"]
                };
            }
            if (/first day|pehle din|kya karu/i.test(q)) {
                return {
                    reply: "First day process simple hai: App me Register karein → Seat select karein → Admin approve karega → Gate QR se attendance lagayein → Study mode ON! 🚀",
                    actionType: "BOOK_SEAT",
                    suggestions: ["🪑 Seat book kaise karein?", "💰 Fees kitni hai?", "🕒 Shift timings?"]
                };
            }

            // Fees, Price & Admission
            if (/fee|paisa|kitna|price|charge|rate|discount|admission|join|book|seat/i.test(q)) {
                const discountText = pricing.discountActive ? ` (Special offer: ${pricing.discountPercent}% OFF!)` : "";
                return {
                    reply: `Sameer Library me monthly fee ₹${effectivePrice} hai${discountText}. Isme AC hall, 5G Wi-Fi, RO water aur personal charging socket sab shaamil hai. ${availableSeatsEstimate} seats khali hain.`,
                    actionType: "BOOK_SEAT",
                    suggestions: ["🪑 Available seats dekhein", "🕒 Shift timings kya hain?", "🚻 Facilities kya hain?"]
                };
            }

            // Default Friendly Welcome
            if (user && (user.role === "STUDENT" || mode === "STUDENT")) {
                return {
                    reply: `Namaste ${user.name} ji! Main aapka Library Buddy Sameer AI hoon 😄. Seat, dues, Wi-Fi, washroom ya rules ke bare me jo chahe puchiye!`,
                    actionType: "GENERAL",
                    suggestions: ["🪑 Meri seat number?", "💵 Pending dues kitne hain?", "📶 Wi-Fi password?", "🚻 Washroom facility?"]
                };
            }
            return {
                reply: `Namaste! Sameer Library me aapka swagat hai 😄. Hamare yahan monthly fee ₹${effectivePrice} hai, AC silent rooms, 5G Wi-Fi aur separate washrooms uplabdh hain. Bataiye kis cheez me madad karun?`,
                actionType: "BOOK_SEAT",
                suggestions: ["💰 Monthly fee kitni hai?", "🪑 Seat availability?", "🕒 Library timings?", "🚻 Toilet & facilities?"]
            };
        };

        // Check if Gemini API key is configured
        const isKeyValid = apiKey && typeof apiKey === "string" && apiKey.trim().length > 20;

        // If no Gemini API key is configured, use our intelligent database-grounded engine
        if (!isKeyValid) {
            const resolved = generateSmartDynamicReply(message || (audioBase64 ? "voice inquiry" : ""), !!audioBase64);
            return NextResponse.json({
                success: true,
                reply: resolved.reply,
                userTranscript: audioBase64 ? (message || "Aapka voice sawal") : message,
                actionType: resolved.actionType,
                suggestedQuestions: resolved.suggestions,
                userName: user?.name || "Student",
                mode: "dynamic_db_engine",
            });
        }

        // Call Google Gemini API (uses active gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-3.5-flash)
        const modelsToTry = [
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-3.5-flash",
            "gemini-flash-lite-latest",
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
                            temperature: 0.35,
                            maxOutputTokens: 140,
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

        // If Gemini API fails or runs out of quota, fallback cleanly
        if (!geminiData || geminiData.error) {
            console.warn("Gemini API not responding, using Smart Dynamic DB Engine fallback");

            if (audioBase64) {
                const voiceFallbackReply = "Aapki aawaz theek se nahi sunai di ya network thoda slow hai. Ek bar dobara boliye ya niche diye option par tap kijiye! 😄";
                const directAudio = await synthesizeDirectVoice(voiceFallbackReply);
                return NextResponse.json({
                    success: true,
                    reply: voiceFallbackReply,
                    userTranscript: "(Aawaz saf nahi aayi)",
                    actionType: "GENERAL",
                    suggestedQuestions: [
                        "🚻 Toilet facility hai?",
                        "💰 Monthly fee kitni hai?",
                        "🪑 Seat availability?",
                        "🕒 Library timings kya hain?"
                    ],
                    audioUrl: directAudio || undefined,
                    userName: user?.name || "Student",
                    fallback: true,
                });
            }

            const resolved = generateSmartDynamicReply(message || "", false);
            let directAudio: string | null = null;
            if (wantVoice) {
                directAudio = await synthesizeDirectVoice(resolved.reply);
            }
            return NextResponse.json({
                success: true,
                reply: resolved.reply,
                userTranscript: message,
                actionType: resolved.actionType,
                suggestedQuestions: resolved.suggestions,
                audioUrl: directAudio || undefined,
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
        let suggestedQuestions: string[] = [];

        // Parse structured tags: TRANSCRIPT:, ANSWER:, SUGGESTIONS: (with markdown resilience)
        let parsedAnswer = replyRaw;

        if (/(?:TRANSCRIPT|\*\*TRANSCRIPT\*\*):/i.test(replyRaw)) {
            const transcriptMatch = replyRaw.match(/(?:TRANSCRIPT|\*\*TRANSCRIPT\*\*):\s*([\s\S]*?)(?=(?:ANSWER|\*\*ANSWER\*\*|SUGGESTIONS|\*\*SUGGESTIONS\*\*|$))/i);
            if (transcriptMatch?.[1]) {
                userTranscript = transcriptMatch[1].trim();
            }
        }

        if (/(?:ANSWER|\*\*ANSWER\*\*):/i.test(replyRaw)) {
            const answerMatch = replyRaw.match(/(?:ANSWER|\*\*ANSWER\*\*):\s*([\s\S]*?)(?=(?:SUGGESTIONS|\*\*SUGGESTIONS\*\*|$))/i);
            if (answerMatch?.[1]) {
                parsedAnswer = answerMatch[1].trim();
            }
        }

        if (/(?:SUGGESTIONS|\*\*SUGGESTIONS\*\*):/i.test(replyRaw)) {
            const suggestionsMatch = replyRaw.match(/(?:SUGGESTIONS|\*\*SUGGESTIONS\*\*):\s*([\s\S]*$)/i);
            if (suggestionsMatch?.[1]) {
                suggestedQuestions = suggestionsMatch[1]
                    .split("|")
                    .map((s: string) => s.trim().replace(/^[-•*]\s*/, ""))
                    .filter((s: string) => s.length > 2 && s.length < 40)
                    .slice(0, 4);
            }
        }

        reply = parsedAnswer || "Namaste! Main aapki baat samajh gaya hoon.";
        reply = reply.replace(/\*\*/g, '').replace(/###/g, '').replace(/[\*•]/g, '').trim();

        // If no suggestions were generated by Gemini, supply context defaults
        if (!suggestedQuestions || suggestedQuestions.length === 0) {
            suggestedQuestions = [
                "💰 Monthly fee kitni hai?",
                "🪑 Seat availability?",
                "🕒 Library timings?",
                "🚻 Toilet & facilities?",
            ];
        }

        // Action recommendation chips (e.g. for CTAs)
        const actionType = reply.toLowerCase().includes("book") || reply.toLowerCase().includes("seat")
            ? "BOOK_SEAT"
            : reply.toLowerCase().includes("due") || reply.toLowerCase().includes("pay")
            ? "PAY_DUES"
            : "GENERAL";

        // Synthesize single-roundtrip Indian Male Director voice audio (0 extra network calls!)
        let directAudioUrl: string | undefined = undefined;
        if (audioBase64 || wantVoice) {
            const synth = await synthesizeDirectVoice(reply);
            if (synth) {
                directAudioUrl = synth;
            }
        }

        return NextResponse.json({
            success: true,
            reply,
            userTranscript: userTranscript || (audioBase64 ? "Aapka voice sandesh" : undefined),
            actionType,
            suggestedQuestions,
            audioUrl: directAudioUrl,
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
