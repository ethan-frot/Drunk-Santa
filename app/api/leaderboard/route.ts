export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';

export async function GET(req: Request) {
  try {
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

    return NextResponse.json({ top });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


