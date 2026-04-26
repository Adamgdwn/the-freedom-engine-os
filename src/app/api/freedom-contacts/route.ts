import { NextResponse } from 'next/server';

import {
  createFreedomContact,
  loadFreedomContactSnapshot,
} from '@/lib/freedom-contacts-store';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const snapshot = await loadFreedomContactSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('[freedom-contacts] load failed', error);
    return NextResponse.json(
      { error: 'Unable to load Freedom contacts.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName: string;
      preferredName?: string;
      organization?: string;
      title?: string;
      relationshipContext?: string;
      notes?: string;
      primaryEmail?: string;
      primaryEmailLabel?: string;
      trustForEmail?: boolean;
      approvalRequired?: boolean;
    };

    const contact = await createFreedomContact(body);
    return NextResponse.json(contact);
  } catch (error) {
    console.error('[freedom-contacts] mutation failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to save Freedom contact.' },
      { status: 500 },
    );
  }
}
