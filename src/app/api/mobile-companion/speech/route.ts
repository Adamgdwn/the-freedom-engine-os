import { NextResponse } from "next/server";
import {
  readSpeechTextHeader,
  readSpeechVoiceProfileHeader,
  requestMobileCompanionSpeech
} from "@/lib/mobile-companion-speech";

export async function GET(request: Request) {
  try {
    const text = readSpeechTextHeader(request.headers);
    const voiceProfile = readSpeechVoiceProfileHeader(request.headers);
    const payload = await requestMobileCompanionSpeech({
      text,
      voiceProfile
    });

    return new Response(payload.audio, {
      status: 200,
      headers: {
        "content-type": payload.contentType,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not synthesize Freedom speech."
      },
      { status: 500 }
    );
  }
}
