import { NextResponse } from 'next/server';

import { deleteFreedomEmailRecipient } from '@/lib/freedom-email-store';

export const runtime = 'nodejs';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ recipientId: string }> },
) {
  try {
    const { recipientId } = await context.params;
    return NextResponse.json(await deleteFreedomEmailRecipient(recipientId));
  } catch (error) {
    console.error('[freedom-email] recipient delete failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to delete Freedom email recipient.' },
      { status: 500 },
    );
  }
}
