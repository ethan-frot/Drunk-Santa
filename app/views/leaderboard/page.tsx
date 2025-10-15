'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type TopRow = { rank: number; name: string; bestScore: number };
type PlayerRow = { name: string; bestScore: number; rank: number; inTop: boolean };

export default function LeaderboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pseudo, setPseudo] = useState('');
  const [leaderboard, setLeaderboard] = useState<{ top: TopRow[]; player: PlayerRow | null }>({ top: [], player: null });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const playerPseudo = localStorage.getItem('playerPseudo') || 'Joueur';
    setPseudo(playerPseudo);
  }, [searchParams]);

  useEffect(() => {
    if (!pseudo) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetch(`/api/leaderboard?name=${encodeURIComponent(pseudo)}`, { signal: controller.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data) => setLeaderboard({ top: data.top || [], player: data.player || null }))
      .catch(() => {});
    return () => controller.abort();
  }, [pseudo]);

  const top10: TopRow[] = useMemo(() => {
    const real = (leaderboard.top || []).filter((r) => r.bestScore > 0);
    const filled = [...real];
    for (let i = filled.length + 1; i <= 10; i++) {
      filled.push({ rank: i, name: '-', bestScore: 0 });
    }
    return filled.slice(0, 10);
  }, [leaderboard.top]);

  const playerNotInTop = leaderboard.player && !leaderboard.player.inTop && leaderboard.player.bestScore > 0 ? leaderboard.player : null;

  // Render text with alternating per-letter colors. If startWithRed is true, the
  // first non-space character is red, otherwise green. Spaces are preserved.
  const renderAlternating = (text: string, startWithRed: boolean) => {
    const red = '#B45252';
    const green = '#8AB060';
    let useRed = startWithRed;
    return (
      <>
        {text.split('')
          .map((ch, idx) => {
            if (ch === ' ') return <span key={idx}> </span>;
            const color = useRed ? red : green;
            useRed = !useRed;
            return (
              <span key={idx} style={{ color }}>
                {ch}
              </span>
            );
          })}
      </>
    );
  };

  return (
    <main style={{ minHeight: '100vh', height: '100vh', background: `#040218 url(/assets/scoreboard-background.gif) center/cover no-repeat fixed`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <style jsx global>{`
        @font-face {
          font-family: 'November';
          src: url('/font/November.ttf') format('truetype');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '2rem', width: '100%', maxWidth: '1200px' }}>
        {/* Left column with title and back button, aligned to the left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
          {/* Title framed inside an image — centered without absolute layout */}
          <div style={{ display: 'grid', placeItems: 'center', width: '520px', maxWidth: '38vw' }}>
            {/* background frame image */}
            <img src="/assets/scoreboard/scoreboard-title-background.png" alt="Title" style={{ gridArea: '1 / 1', width: '70%', height: 'auto', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }} />
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
          <img src="/assets/scoreboard/scoreboard-list-background.png" alt="Scoreboard" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }} />

          {/* Overlay grid for rows */}
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

          {/* Player row (not in top) pinned at the bottom over the image */}
          {playerNotInTop && (
            <div style={{ position: 'absolute', left: '14%', right: '14%', bottom: '6%', color: '#8AB060', fontWeight: 700, fontFamily: 'November, system-ui, Arial', fontSize: 'clamp(11px, 1.5vw, 16px)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '56px 1fr', alignItems: 'center' }}>
                <div style={{ textAlign: 'right', paddingRight: '0.4rem' }}>#{playerNotInTop.rank}</div>
                <div style={{ }}>{playerNotInTop.name}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}


