'use server';

import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json().catch(() => ({} as any));
    const level = String(data?.level || 'info').toUpperCase();
    const message = String(data?.message || 'Client log');
    const detail = data?.detail ? ` | detail: ${data.detail}` : '';
    const stamp = new Date().toISOString();
    // Log to server terminal so developers see it in the Next.js dev server
    // Include a clear hint that DB may not be running per requirement
    console.log(`[${stamp}] [CLIENT-${level}] ${message}${detail} | hint: BDD probablement non lancée.`);
  } catch (e) {
    console.log(`[${new Date().toISOString()}] [CLIENT-LOG] Invalid log payload`);
  }
  return new Response(null, { status: 204 });
}


