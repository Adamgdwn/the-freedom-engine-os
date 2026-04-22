import { NextResponse } from "next/server";
import {
  isReplyRequest,
  isSummaryRequest,
  requestMobileCompanionReply,
  requestMobileCompanionSummary
} from "@/lib/mobile-companion";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (isReplyRequest(body)) {
      const payload = await requestMobileCompanionReply(body);
      return NextResponse.json(payload);
    }

    if (isSummaryRequest(body)) {
      const payload = await requestMobileCompanionSummary(body);
      return NextResponse.json(payload);
    }

    return NextResponse.json({ error: "Unsupported mobile companion request." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not complete the mobile companion request."
      },
      { status: 500 }
    );
  }
}
