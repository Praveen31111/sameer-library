import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), "data");
const PRICING_FILE = path.join(DATA_DIR, "pricing.json");

interface PricingConfig {
    monthlyBasePrice: number;
    monthlyPrice: number;
    discountPercent: number;
    discountActive: boolean;
    offerTitle: string;
    weeklyPrice: number;
    dailyPrice: number;
    updatedAt: string;
}

const DEFAULT_PRICING: PricingConfig = {
    monthlyBasePrice: 1000,
    monthlyPrice: 1000,
    discountPercent: 0,
    discountActive: false,
    offerTitle: "Special Student Discount! Book your seat now.",
    weeklyPrice: 300,
    dailyPrice: 50,
    updatedAt: new Date().toISOString(),
};

function getPricing(): PricingConfig {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (!fs.existsSync(PRICING_FILE)) {
            fs.writeFileSync(PRICING_FILE, JSON.stringify(DEFAULT_PRICING, null, 2), "utf-8");
            return DEFAULT_PRICING;
        }
        const data = fs.readFileSync(PRICING_FILE, "utf-8");
        return { ...DEFAULT_PRICING, ...JSON.parse(data) };
    } catch (e) {
        console.error("Error reading pricing config:", e);
        return DEFAULT_PRICING;
    }
}

function savePricing(config: PricingConfig) {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PRICING_FILE, JSON.stringify(config, null, 2), "utf-8");
}

// GET: Fetch current prices & offers for students and admin
export async function GET() {
    try {
        const pricing = getPricing();
        return NextResponse.json({ success: true, pricing });
    } catch (error) {
        console.error("Get pricing error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST: Admin updates prices, discounts, and offer banners
export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user || (user.role !== "ADMIN" && user.role !== "OWNER")) {
            return NextResponse.json({ success: false, error: "Unauthorized. Admin access required." }, { status: 401 });
        }

        const body = await req.json();
        const basePrice = Math.max(0, Number(body.monthlyBasePrice) || 1000);
        const discountPercent = Math.min(100, Math.max(0, Number(body.discountPercent) || 0));
        const discountActive = Boolean(body.discountActive);
        
        // Compute effective monthly price
        const monthlyPrice = discountActive && discountPercent > 0
            ? Math.round(basePrice * (1 - discountPercent / 100))
            : basePrice;

        const updatedPricing: PricingConfig = {
            monthlyBasePrice: basePrice,
            monthlyPrice,
            discountPercent,
            discountActive,
            offerTitle: body.offerTitle?.trim() || "Limited Time Offer: Book your monthly seat at a discount!",
            weeklyPrice: Math.max(0, Number(body.weeklyPrice) || 300),
            dailyPrice: Math.max(0, Number(body.dailyPrice) || 50),
            updatedAt: new Date().toISOString(),
        };

        savePricing(updatedPricing);

        return NextResponse.json({
            success: true,
            message: "Pricing and discount offers updated successfully!",
            pricing: updatedPricing,
        });
    } catch (error) {
        console.error("Update pricing error:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}
