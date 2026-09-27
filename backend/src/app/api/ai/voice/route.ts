import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = 'force-dynamic';

const HUGGINGFACE_TOKEN = process.env.HUGGINGFACE_TOKEN;
const VERCEL_PUBLIC_VOICE_URL = "https://sameer-library-ten.vercel.app/voices/sameer-voice.wav";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { text, language = "Hindi" } = body;

        if (!text || typeof text !== "string" || text.trim().length === 0) {
            return NextResponse.json({
                success: false,
                error: "Text is required for voice synthesis"
            }, { status: 400 });
        }

        const cleanText = text.replace(/[\*\#\_]/g, '').trim();

        // 1. Synthesize using active Hugging Face XTTS-v2 Space with Sameer Sir's WAV Voice
        try {
            const { Client } = await import("@gradio/client");

            const token = process.env.HUGGINGFACE_TOKEN || HUGGINGFACE_TOKEN;
            const clientOptions: any = {};
            if (token && token.startsWith("hf_")) {
                clientOptions.token = token;
            }

            // Connect to active live XTTS-v2 space
            const client = await Client.connect("hasanbasbunar/Voice-Cloning-XTTS-v2", clientOptions);

            const result: any = await client.predict("/voice_clone_synthesis", [
                cleanText,                   // text to speak
                VERCEL_PUBLIC_VOICE_URL,     // reference_audio_url (Sameer Sir's real voice sample)
                null,                        // example_audio_name (MUST BE null so it uses reference_audio_url)
                "Hindi",                     // language
                0.75,                        // temperature
                1.0,                         // speed
                true,                        // do_sample
                5,                           // repetition_penalty
                1,                           // length_penalty
                30,                          // gpt_cond_len
                50,                          // top_k
                0.85,                        // top_p
                true,                        // remove_silence_enabled
                -45,                         // silence_threshold
                300,                         // min_silence_len
                100,                         // keep_silence
                "Native XTTS splitting",     // text_splitting_method
                250,                         // max_chars_per_segment
                false                        // enable_preprocessing
            ]);

            if (result?.data?.[0]) {
                const audioFileUrl = result.data[0]?.url || result.data[0];
                if (typeof audioFileUrl === "string" && audioFileUrl.startsWith("http")) {
                    return NextResponse.json({
                        success: true,
                        audioUrl: audioFileUrl,
                        cloned: true,
                    });
                }
            }
        } catch (cloneErr: any) {
            console.warn("Hugging Face XTTS synthesis warning:", cloneErr?.message || cloneErr);
        }

        // Graceful fallback to client native TTS if space is busy or queuing
        return NextResponse.json({
            success: true,
            fallbackTts: true,
            text: cleanText,
        });

    } catch (error: any) {
        console.error("Voice API route error:", error);
        return NextResponse.json({
            success: false,
            error: error?.message || "Internal server error"
        }, { status: 500 });
    }
}
