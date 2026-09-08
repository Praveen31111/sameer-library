/**
 * WhatsApp 0-Cost Notification Utility for Sameer Library
 * Uses direct WhatsApp URI protocol (wa.me) - 100% Free Forever without Meta/Twilio API fees
 */

export interface WhatsAppDueMessageParams {
    studentName: string;
    phone: string;
    seatNumber: string;
    branchName: string;
    planType?: string;
    totalFee: number;
    paidAmount: number;
    dueAmount: number;
    dueDate?: string | Date;
    upiId?: string; // Optional library UPI ID, e.g. sameerlibrary@upi
    receiptUrl?: string;
}

/**
 * Normalizes phone number to 12-digit Indian format (91XXXXXXXXXX)
 */
export function formatIndianPhoneNumber(phone: string): string {
    const cleaned = (phone || "").replace(/\D/g, "");
    if (cleaned.length === 10) {
        return `91${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith("91")) {
        return cleaned;
    }
    return cleaned;
}

/**
 * Generates an official, beautifully formatted WhatsApp text and direct wa.me link
 */
export function generateWhatsAppDuePayload(params: WhatsAppDueMessageParams): { messageText: string; whatsappUrl: string } {
    const formattedPhone = formatIndianPhoneNumber(params.phone);
    const dueDateFormatted = params.dueDate 
        ? new Date(params.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "Immedate";

    const defaultUpiId = params.upiId || process.env.NEXT_PUBLIC_LIBRARY_UPI_ID || "sameerlibrary@okaxis";

    // Build human-friendly professional message
    const lines = [
        `🏛️ *SAMEER DIGITAL LIBRARY - FEE DUE REMINDER*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        `Namaste *${params.studentName}* ji,`,
        ``,
        `Aapki library seat ki monthly subscription fee details niche di gayi hain:`,
        ``,
        `👤 *Student Name:* ${params.studentName}`,
        `🪑 *Seat No:* ${params.seatNumber}`,
        `📍 *Branch:* ${params.branchName}`,
        `📅 *Last Due Date:* ${dueDateFormatted}`,
        ``,
        `💰 *Fee Summary:*`,
        `• Total Monthly Fee: ₹${params.totalFee}`,
        `• Paid Amount: ₹${params.paidAmount}`,
        `• *Current Due Balance: ₹${params.dueAmount}*`,
        ``,
        `📲 *Quick Payment Options:*`,
        `1. Library counter par Cash jama kar sakte hain.`,
        `2. Ya is direct UPI link se Pay kar sakte hain:`,
        `upi://pay?pa=${defaultUpiId}&pn=Sameer%20Library&am=${params.dueAmount}&cu=INR&tn=Fee_Due_Seat_${params.seatNumber}`,
    ];

    if (params.receiptUrl) {
        lines.push(``, `📄 *Digital Pass / Bill View:* ${params.receiptUrl}`);
    }

    lines.push(
        ``,
        `Kripya time par fee jama karke apni seat continue rakhein. Kisi bhi sahayata ke liye library desk par sampark karein.`,
        ``,
        `🙏 _Thank you for choosing Sameer Digital Library!_`,
        `📞 Admin Contact: +91 9876543210`
    );

    const messageText = lines.join("\n");
    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedText}`;

    return { messageText, whatsappUrl };
}
