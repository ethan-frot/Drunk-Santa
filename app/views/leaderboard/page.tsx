'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { renderAlternating } from '@/app/utils/renderAlternating';
import { useRouter } from 'next/navigation';
import HomeButton from '@/app/components/HomeButton';

type TopRow = { rank: number; name: string; bestScore: number };

function LeaderboardView() {
  const router = useRouter();
  const [top, setTop] = useState<TopRow[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dots, setDots] = useState(1);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    const start = Date.now();
    fetch(`/api/leaderboard`, { signal: controller.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data) => setTop(data.top || []))
      .catch(() => {})
      .finally(() => {
        // Random visible time between 1 and 2 cycles
        const stepMs = 420; // dots update cadence
        const cycleMs = 3 * stepMs; // one cycle = '.', '..', '...'
        const minMs = cycleMs * 1; // 1 cycle
        const maxMs = cycleMs * 2; // 2 cycles
        const targetVisibleMs = minMs + Math.random() * (maxMs - minMs);
        const elapsed = Date.now() - start;
        const wait = Math.max(0, Math.round(targetVisibleMs) - elapsed);
        setTimeout(() => setIsLoading(false), wait);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    let mounted = true;
    const id = setInterval(() => {
      if (!mounted) return;
      setDots((d) => (d % 3) + 1);
    }, 420);
    return () => { mounted = false; clearInterval(id); };
  }, [isLoading]);

  const top10: TopRow[] = useMemo(() => {
    const real = (top || []).filter((r) => r.bestScore > 0);
    const filled = [...real];
    for (let i = filled.length + 1; i <= 10; i++) {
      filled.push({ rank: i, name: '-', bestScore: 0 });
    }
    return filled.slice(0, 10);
  }, [top]);

  return (
    <main style={{ minHeight: '100vh', height: '100vh', background: `#040218 url(/assets/ui/background-menu.gif) center/cover no-repeat fixed`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative' }}>
      <HomeButton />
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '2rem', width: '100%', maxWidth: '1200px' }}>
        {/* Left column with title and back button, aligned to the left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
          {/* Title framed inside an image — centered without absolute layout */}
          <div style={{ display: 'grid', placeItems: 'center', width: '520px', maxWidth: '38vw' }}>
            {/* background frame image */}
            <img src="/assets/ui/scoreboard/scoreboard-title-background.png" alt="Title" style={{ gridArea: '1 / 1', width: '70%', height: 'auto', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }} />
            {/* centered text overlay */}
            <div style={{ gridArea: '1 / 1', textAlign: 'center', lineHeight: 1.05 }}>
              <div style={{ fontFamily: 'November, system-ui, Arial', fontWeight: 700, fontSize: 'clamp(18px, 3vw, 36px)', textShadow: '0 2px 0 rgba(0,0,0,0.25)' }}>
                {renderAlternating('Liste des', true)}
              </div>
              <div style={{ fontFamily: 'November, system-ui, Arial', fontWeight: 700, fontSize: 'clamp(18px, 3vw, 36px)', textShadow: '0 2px 0 rgba(0,0,0,0.25)' }}>
                {renderAlternating('enfants sages', false)}
              </div>
            </div>
          </div>
        </div>

        {/* Scoreboard card using background image */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '820px', aspectRatio: '4 / 3' }}>
          {/* Background image */}
          <img src="/assets/ui/scoreboard/scoreboard-list-background.png" alt="Scoreboard" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }} />

          {/* Overlay grid for rows or loading state */}
          {isLoading ? (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '10% 30% 5% 25%' }}>
              <div style={{
                fontWeight: 700,
                fontFamily: 'November, system-ui, Arial',
                fontSize: 'clamp(14px, 2vw, 22px)',
                textShadow: '0 2px 0 rgba(0,0,0,0.25)'
              }}>
                {renderAlternating(`Chargement${'.'.repeat(dots)}`, true)}
              </div>
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateRows: 'repeat(10, 1fr)', padding: '10% 30% 5% 25%' }}>
              {top10.map((row, i) => {
                const rowColor = i % 2 === 0 ? '#8AB060' : '#B45252';
                return (
                  <div key={row.rank} style={{ display: 'grid', gridTemplateColumns: '56px 1fr 48px', alignItems: 'center', color: rowColor, fontWeight: 700, fontFamily: 'November, system-ui, Arial', fontSize: 'clamp(11px, 1.5vw, 16px)', borderBottom: i < 9 ? '1px dashed #c6bfae' : 'none' }}>
                    <div style={{ textAlign: 'right', paddingRight: '0.4rem' }}>#{row.rank}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</div>
                    <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.bestScore > 0 ? row.bestScore : ''}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No player-specific row; only Top 10 is displayed */}
        </div>
      </div>
    </main>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={null}>
      <LeaderboardView />
    </Suspense>
  );
}


