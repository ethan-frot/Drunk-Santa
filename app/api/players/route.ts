export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      select: { name: true },
      orderBy: { name: 'asc' }
    });
    const names = players.map((p) => p.name);
    return NextResponse.json(names);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


