export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/prisma';

// Server-side definition of abilities and their cost/stage caps.
// Keep this in sync with client values shown to the user.
const ABILITIES = {
  movement_speed: {
    cost: [10, 25, 50],
    maxStages: 3,
  },
  gift_size: {
    cost: [15, 35, 70],
    maxStages: 3,
  },
  dash_cooldown: {
    cost: [20, 45, 90],
    maxStages: 3,
  },
  snowflake_value: {
    cost: [25, 60, 120],
    maxStages: 3,
  },
} as const;

type AbilityId = keyof typeof ABILITIES;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const name = (searchParams.get('name') || '').trim();
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

    // Ensure the player exists
    const player = await (prisma as any).player.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true, totalSnowflakes: true },
    });

    // Fetch ability stages (ensure we include zero entries as absent)
    const abilities = await (prisma as any).playerAbility.findMany({
      where: { playerId: player.id },
      select: { abilityId: true, currentStage: true },
      orderBy: { abilityId: 'asc' },
    });

    // Return all known abilities, defaulting to stage 0
    const stages: Record<string, number> = {};
    (Object.keys(ABILITIES) as AbilityId[]).forEach((id) => {
      const found = abilities.find((a: { abilityId: string; currentStage: number }) => a.abilityId === id);
      stages[id] = found?.currentStage ?? 0;
    });

    return NextResponse.json({
      name,
      totalSnowflakes: player.totalSnowflakes,
      abilities: stages,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, abilityId } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }
    if (!abilityId || typeof abilityId !== 'string') {
      return NextResponse.json({ error: 'Invalid abilityId' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const id = abilityId as AbilityId;
    if (!(id in ABILITIES)) {
      return NextResponse.json({ error: 'Unknown ability' }, { status: 400 });
    }

    // Perform the purchase in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Ensure player exists
      const player = await (tx as any).player.upsert({
        where: { name: trimmedName },
        update: {},
        create: { name: trimmedName },
        select: { id: true, totalSnowflakes: true },
      });

      // Current stage (0 if none yet)
      const existingAbility = await (tx as any).playerAbility.findUnique({
        where: { playerId_abilityId: { playerId: player.id, abilityId: id } },
        select: { id: true, currentStage: true },
      });

      const currentStage = existingAbility?.currentStage ?? 0;
      const { cost, maxStages } = ABILITIES[id];

      if (currentStage >= maxStages) {
        return { ok: false as const, reason: 'Already at max stage' };
      }

      const price = cost[currentStage];
      if (player.totalSnowflakes < price) {
        return { ok: false as const, reason: 'Not enough snowflakes' };
      }

      // Deduct and increment stage
      await (tx as any).player.update({
        where: { id: player.id },
        data: { totalSnowflakes: { decrement: price } },
      });

      if (existingAbility) {
        await (tx as any).playerAbility.update({
          where: { id: existingAbility.id },
          data: { currentStage: { increment: 1 } },
        });
      } else {
        await (tx as any).playerAbility.create({
          data: {
            playerId: player.id,
            abilityId: id,
            currentStage: 1,
          },
        });
      }

      const updated = await (tx as any).player.findUnique({
        where: { id: player.id },
        select: { totalSnowflakes: true },
      });

      return {
        ok: true as const,
        totalSnowflakes: updated?.totalSnowflakes ?? 0,
        newStage: currentStage + 1,
        abilityId: id,
      };
    });

    if (!result.ok) {
      const status = result.reason === 'Not enough snowflakes' ? 409 : 400;
      return NextResponse.json({ ok: false, message: result.reason }, { status });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}


