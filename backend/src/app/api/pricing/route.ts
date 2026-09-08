import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

interface PricingConfig {
    monthlyBasePrice: number;
    monthlyPrice: number;
    discountPercent: number;
    discountActive: boolean;
    offerTitle: string;
    updatedAt: string;
}

const DEFAULT_PRICING: PricingConfig = {
    monthlyBasePrice: 1000,
    monthlyPrice: 1000,
    discountPercent: 0,
    discountActive: false,
    offerTitle: "Special Student Discount! Book your monthly seat now.",
    updatedAt: new Date().toISOString(),
};

declare global {
    var __cachedPricing: PricingConfig | undefined;
}

async function getPricing(): Promise<PricingConfig> {
    // 1. Try DB first (Neon PostgreSQL - persists across all Vercel/Render instances!)
    try {
        const row = await prisma.systemConfig.findUnique({
            where: { key: "pricing" }
        });
        if (row && row.value) {
            const parsed = JSON.parse(row.value);
            global.__cachedPricing = parsed;
            return { ...DEFAULT_PRICING, ...parsed };
        }
    } catch (dbErr) {
        console.warn("Pricing DB read warning:", dbErr);
    }

    // 2. Try global in-memory cache
    if (global.__cachedPricing) {
        return global.__cachedPricing;
    }

    // 3. Try local file fallback
    try {
        const localFile = path.join(process.cwd(), "data", "pricing.json");
        if (fs.existsSync(localFile)) {
            const fileData = fs.readFileSync(localFile, "utf-8");
            const parsed = JSON.parse(fileData);
            global.__cachedPricing = parsed;
            return { ...DEFAULT_PRICING, ...parsed };
        }
    } catch (fsErr) {
        console.warn("Pricing FS read warning:", fsErr);
    }

    return DEFAULT_PRICING;
}

async function savePricing(config: PricingConfig): Promise<void> {
    // 1. Update in-memory cache immediately
    global.__cachedPricing = config;

    // 2. Persist to PostgreSQL database (Primary source of truth for Vercel/Render!)
    try {
        await prisma.systemConfig.upsert({
            where: { key: "pricing" },
            update: { value: JSON.stringify(config) },
            create: { key: "pricing", value: JSON.stringify(config) }
        });
    } catch (dbErr) {
        console.error("Pricing DB save error:", dbErr);
    }

    // 3. Best-effort local file write (safe against read-only Vercel filesystem)
    try {
        const dataDir = path.join(process.cwd(), "data");
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(path.join(dataDir, "pricing.json"), JSON.stringify(config, null, 2), "utf-8");
    } catch (fsErr) {
        // Silently ignore filesystem write errors on read-only serverless/Docker containers
        console.warn("Local pricing file save skipped (read-only container):", fsErr);
    }
}

// GET: Fetch current prices & offers for students and admin
export async function GET() {
    try {
        const pricing = await getPricing();
        return NextResponse.json({ success: true, pricing });
    } catch (error: any) {
        console.error("Get pricing error:", error);
        return NextResponse.json({ success: true, pricing: DEFAULT_PRICING });
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
            updatedAt: new Date().toISOString(),
        };

        await savePricing(updatedPricing);

        return NextResponse.json({
            success: true,
            message: "Pricing and discount offers updated successfully!",
            pricing: updatedPricing,
        });
    } catch (error: any) {
        console.error("Update pricing error:", error);
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to update pricing" },
            { status: 500 }
        );
    }
}
