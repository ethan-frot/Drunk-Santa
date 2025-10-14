export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';

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

    const incomingScore = Math.trunc(score);

    const existing = await prisma.player.findUnique({
      where: { name: trimmedName },
      select: { id: true, bestScore: true },
    });

    if (!existing) {
      const created = await prisma.player.create({
        data: { name: trimmedName, bestScore: incomingScore },
        select: { id: true, bestScore: true },
      });
      return NextResponse.json({ ok: true, playerId: created.id, bestScore: created.bestScore });
    }

    if (incomingScore > existing.bestScore) {
      const updated = await prisma.player.update({
        where: { id: existing.id },
        data: { bestScore: incomingScore },
        select: { id: true, bestScore: true },
      });
      return NextResponse.json({ ok: true, playerId: updated.id, bestScore: updated.bestScore });
    }

    return NextResponse.json({ ok: true, playerId: existing.id, bestScore: existing.bestScore });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


