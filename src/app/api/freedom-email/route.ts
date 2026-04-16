import { NextResponse } from 'next/server';

import {
  createFreedomEmailRecipient,
  loadFreedomEmailSnapshot,
  sendFreedomEmail,
} from '@/lib/freedom-email-store';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const snapshot = await loadFreedomEmailSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('[freedom-email] load failed', error);
    return NextResponse.json(
      { error: 'Unable to load Freedom email state.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as
      | {
          action: 'recipient.create';
          label: string;
          destination: string;
        }
      | {
          action: 'draft.send';
          draftId?: string | null;
          recipientId?: string | null;
          recipientDestination?: string | null;
          recipientLabel?: string | null;
          subject: string;
          intro?: string;
          body: string;
        };

    if (body.action === 'recipient.create') {
      const recipient = await createFreedomEmailRecipient({
        label:       body.label,
        destination: body.destination,
      });
      return NextResponse.json(recipient);
    }

    if (body.action === 'draft.send') {
      const result = await sendFreedomEmail({
        draftId:              body.draftId,
        recipientId:          body.recipientId,
        recipientDestination: body.recipientDestination,
        recipientLabel:       body.recipientLabel,
        subject:              body.subject,
        intro:                body.intro,
        body:                 body.body,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unsupported Freedom email action.' }, { status: 400 });
  } catch (error) {
    console.error('[freedom-email] mutation failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to complete Freedom email action.' },
      { status: 500 },
    );
  }
}
