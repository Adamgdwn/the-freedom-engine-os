import { NextResponse } from 'next/server';

import { deleteFreedomContact } from '@/lib/freedom-contacts-store';

export const runtime = 'nodejs';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ contactId: string }> },
) {
  try {
    const { contactId } = await context.params;
    return NextResponse.json(await deleteFreedomContact(contactId));
  } catch (error) {
    console.error('[freedom-contacts] delete failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to delete Freedom contact.' },
      { status: 500 },
    );
  }
}
