import { NextResponse } from 'next/server';
import type { FreedomMemoryUpdateRequest } from '@/lib/freedom-memory';
import {
  loadFreedomMemorySnapshot,
  persistFreedomMemoryUpdate,
} from '@/lib/freedom-memory-store';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const snapshot = await loadFreedomMemorySnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    console.error('[freedom-memory] load failed', error);
    return NextResponse.json(
      { error: 'Unable to load Freedom memory.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as FreedomMemoryUpdateRequest;
    const result = await persistFreedomMemoryUpdate(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[freedom-memory] persist failed', error);
    return NextResponse.json(
      { error: 'Unable to persist Freedom memory.' },
      { status: 500 },
    );
  }
}
