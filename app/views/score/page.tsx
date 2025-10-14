'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DisplayScorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pseudo, setPseudo] = useState('');
  const [score, setScore] = useState(0);
  const postedRef = useRef(false);
  const [leaderboard, setLeaderboard] = useState<{ top: { rank: number; name: string; bestScore: number }[]; player: { name: string; bestScore: number; rank: number; inTop: boolean } | null }>({ top: [], player: null });
  const leaderboardAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const playerPseudo = localStorage.getItem('playerPseudo') || 'Joueur';
    setPseudo(playerPseudo);

   
    const fromStorage = parseInt(localStorage.getItem('gameScore') || '0');
    setScore(fromStorage);
  }, [searchParams]);

  const loadLeaderboard = (name: string) => {
    if (!name) return;
    // abort any in-flight leaderboard request
    if (leaderboardAbortRef.current) leaderboardAbortRef.current.abort();
    const controller = new AbortController();
    leaderboardAbortRef.current = controller;
    fetch(`/api/leaderboard?name=${encodeURIComponent(name)}`, { signal: controller.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data) => setLeaderboard({ top: data.top || [], player: data.player || null }))
      .catch(() => {});
  };

  useEffect(() => {
    if (!pseudo) return;
    // If a post is about to happen (score > 0), let the POST callback refresh leaderboard.
    // Else, load immediately (e.g., score 0 or revisit page).
    if (score > 0 && !postedRef.current) return;
    loadLeaderboard(pseudo);
  }, [pseudo, score]);

  useEffect(() => {
    if (postedRef.current) return;
    if (!pseudo || !Number.isFinite(score)) return;
    if (score <= 0) return;

    // ensure first paint before posting
    const schedule = (cb: () => void) => {
      // @ts-ignore requestIdleCallback exists in modern browsers
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        // @ts-ignore
        window.requestIdleCallback(cb, { timeout: 1000 });
      } else {
        setTimeout(cb, 300);
      }
    };

    const controller = new AbortController();
    const { signal } = controller;

    postedRef.current = true;
    schedule(() => {
      if (signal.aborted) return;
      fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pseudo, score }),
        signal
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            // eslint-disable-next-line no-console
            console.warn('Failed to save score', data?.error || res.statusText);
          } else {
            // eslint-disable-next-line no-console
            console.log('Score saved');
            // refresh leaderboard so the user sees their new rank immediately
            loadLeaderboard(pseudo);
          }
        })
        .catch((err) => {
          if (signal.aborted) return;
          // eslint-disable-next-line no-console
          console.warn('Error saving score', err);
        });
    });

    return () => controller.abort();
  }, [pseudo, score]);

  const top10 = (() => {
    const real = (leaderboard.top || []).filter((r) => r.bestScore > 0);
    const filled = [...real];
    for (let i = filled.length + 1; i <= 10; i++) {
      filled.push({ rank: i, name: '-', bestScore: 0 });
    }
    return filled.slice(0, 10);
  })();

  const playerNotInTop = leaderboard.player && !leaderboard.player.inTop && leaderboard.player.bestScore > 0 ? leaderboard.player : null;

  return (
    <main style={{ 
      minHeight: '100vh', 
      height: '100vh', 
      background: '#040218',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'stretch',
      justifyContent: 'center',
      gap: '2.5rem',
      padding: '2rem'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2.5rem' }}>
        <h1 style={{ 
          fontSize: '3.5rem', 
          fontWeight: 'bold', 
          color: '#e7e9ff',
          margin: 0,
          textAlign: 'center'
        }}>
          Partie Terminée!
        </h1>

        <div style={{
        background: 'rgba(231, 233, 255, 0.1)',
        borderRadius: '20px',
        padding: '3rem 4rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        alignItems: 'center',
        border: '2px solid rgba(231, 233, 255, 0.2)'
        }}>
          <div style={{
          fontSize: '1.3rem',
          color: '#e7e9ff',
          opacity: 0.8
          }}>
            Joueur
          </div>
          <div style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#e7e9ff'
          }}>
            {pseudo}
          </div>

          <div style={{
          width: '100%',
          height: '2px',
          background: 'rgba(231, 233, 255, 0.2)',
          margin: '1rem 0'
          }} />

          <div style={{
          fontSize: '1.3rem',
          color: '#e7e9ff',
          opacity: 0.8
          }}>
            Score
          </div>
          <div style={{
          fontSize: '4rem',
          fontWeight: 'bold',
          color: '#e7e9ff'
          }}>
            {score}
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('playerPseudo');
                localStorage.removeItem('gameScore');
              } catch {}
              router.push('/');
            }}
            style={{
              padding: '1rem 2.5rem',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#e7e9ff',
              background: 'rgba(231, 233, 255, 0.1)',
              border: '2px solid #e7e9ff',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.background = 'rgba(231, 233, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'rgba(231, 233, 255, 0.1)';
            }}
          >
            Menu Principal
          </button>
        </div>
      </div>

      <aside style={{
        width: '380px',
        alignSelf: 'center',
        background: 'rgba(231, 233, 255, 0.06)',
        borderRadius: '18px',
        border: '2px solid rgba(231, 233, 255, 0.2)',
        padding: '1.25rem',
        color: '#e7e9ff'
      }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>Classement</div>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 90px', gap: '0.5rem', alignItems: 'center' }}>
          {top10.map((row) => {
            const isPlayer = row.name === pseudo && row.name !== '-';
            return (
              <div key={row.rank} style={{
                display: 'contents'
              }}>
                <div style={{ opacity: 0.8, textAlign: 'right', paddingRight: '0.5rem' }}>#{row.rank}</div>
                <div style={{
                  padding: '0.5rem 0.75rem',
                  background: isPlayer ? 'rgba(255, 209, 102, 0.2)' : 'transparent',
                  borderRadius: '8px'
                }}>{row.name}</div>
              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.bestScore > 0 ? row.bestScore : ''}</div>
              </div>
            );
          })}
        </div>

        {playerNotInTop && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed rgba(231, 233, 255, 0.25)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 90px', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ opacity: 0.8, textAlign: 'right', paddingRight: '0.5rem' }}>#{playerNotInTop.rank}</div>
              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(102, 191, 255, 0.2)', borderRadius: '8px' }}>{playerNotInTop.name}</div>
              <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{playerNotInTop.bestScore > 0 ? playerNotInTop.bestScore : ''}</div>
            </div>
          </div>
        )}
      </aside>
    </main>
  );
}


