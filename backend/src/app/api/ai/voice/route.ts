import { NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request) {
    let reqText = "";
    try {
        const body = await req.json();
        const { text } = body;
        reqText = typeof text === "string" ? text : "";

        if (!reqText || reqText.trim().length === 0) {
            return NextResponse.json({
                success: false,
                error: "Text is required for voice synthesis"
            }, { status: 400 });
        }

        const cleanText = reqText.replace(/[\*\#\_]/g, '').trim();

        // High-Quality Indian Hindi Male Voice (Warm, Respectful Library Director Voice)
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
        const base64Audio = `data:audio/mp3;base64,${audioBuffer.toString("base64")}`;

        return NextResponse.json({
            success: true,
            audioUrl: base64Audio,
            voice: "hi-IN-MadhurNeural (Indian Male Director)",
        });

    } catch (error: any) {
        console.error("Voice API route error:", error);
        return NextResponse.json({
            success: true,
            fallbackTts: true,
            text: reqText,
        });
    }
}
