export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { name, score } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 });
    }

    const trimmedName = name.trim();

    const player = await prisma.player.upsert({
      where: { name: trimmedName },
      update: {},
      create: { name: trimmedName },
    });

    const created = await prisma.score.create({
      data: {
        value: Math.trunc(score),
        playerId: player.id,
      },
    });

    return NextResponse.json({ ok: true, playerId: player.id, scoreId: created.id });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


