export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const name = (searchParams.get('name') || '').trim();
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

    const player = await prisma.player.findUnique({ where: { name }, select: { rating: true } });
    if (!player) return NextResponse.json({ rating: 0 });
    return NextResponse.json({ rating: player.rating || 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, rating } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    if (typeof rating !== 'number' || !Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const incoming = Math.trunc(rating);

    // Ensure player exists
    const player = await prisma.player.upsert({
      where: { name: trimmedName },
      update: {},
      create: { name: trimmedName },
      select: { id: true, rating: true }
    });

    if ((player.rating || 0) >= incoming) {
      return NextResponse.json({ ok: false, message: 'Rating already set, cannot lower' }, { status: 409 });
    }

    const updated = await prisma.player.update({
      where: { id: player.id },
      data: { rating: incoming },
      select: { id: true, rating: true }
    });

    return NextResponse.json({ ok: true, playerId: updated.id, rating: updated.rating });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


