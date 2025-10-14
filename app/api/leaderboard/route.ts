export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const nameParam = (searchParams.get('name') || '').trim();

    // Top 10 leaderboard by bestScore desc, then name asc for stable order
    const topPlayers = await prisma.player.findMany({
      where: {},
      select: { name: true, bestScore: true },
      orderBy: [
        { bestScore: 'desc' },
        { name: 'asc' },
      ],
      take: 10,
    });

    const top = topPlayers.map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      bestScore: p.bestScore,
    }));

    let player = null as null | { name: string; bestScore: number; rank: number; inTop: boolean };

    if (nameParam) {
      const existing = await prisma.player.findUnique({ where: { name: nameParam }, select: { name: true, bestScore: true } });
      if (existing) {
        const higherCount = await prisma.player.count({ where: { bestScore: { gt: existing.bestScore } } });
        const rank = higherCount + 1;
        const inTop = top.some((t) => t.name === existing.name);
        player = { name: existing.name, bestScore: existing.bestScore, rank, inTop };
      }
    }

    return NextResponse.json({ top, player });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


