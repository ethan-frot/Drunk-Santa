export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';

export async function POST(req: Request) {
  try {
    const { name, delta } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    const amount = Number(delta);
    if (!Number.isFinite(amount) || Math.trunc(amount) !== amount || amount < 0) {
      return NextResponse.json({ error: 'Invalid delta' }, { status: 400 });
    }

    const trimmedName = name.trim();

    const updated = await (prisma as any).player.upsert({
      where: { name: trimmedName },
      update: { totalSnowflakes: { increment: amount } },
      create: { name: trimmedName, totalSnowflakes: amount },
      select: { id: true, totalSnowflakes: true },
    });

    return NextResponse.json({ ok: true, playerId: updated.id, totalSnowflakes: updated.totalSnowflakes });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { name, total } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    const absolute = Number(total);
    if (!Number.isFinite(absolute) || Math.trunc(absolute) !== absolute || absolute < 0) {
      return NextResponse.json({ error: 'Invalid total' }, { status: 400 });
    }

    const trimmedName = name.trim();

    const updated = await (prisma as any).player.upsert({
      where: { name: trimmedName },
      update: { totalSnowflakes: absolute },
      create: { name: trimmedName, totalSnowflakes: absolute },
      select: { id: true, totalSnowflakes: true },
    });

    return NextResponse.json({ ok: true, playerId: updated.id, totalSnowflakes: updated.totalSnowflakes });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


