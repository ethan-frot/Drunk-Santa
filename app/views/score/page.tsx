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
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showRatingWarning, setShowRatingWarning] = useState(false);

  const StarIcon = ({ active }: { active: boolean }) => {
    const [frame, setFrame] = useState<1 | 2 | 3>(active ? 1 : 3);

    useEffect(() => {
      let mounted = true;
      let timeout: any;

      const scheduleBlink = () => {
        // Remain mostly on star1 (eyes open), then blink: 1 -> 2 -> 3 -> 2 -> 1
        if (!mounted) return;
        setFrame(1);
        timeout = setTimeout(() => {
          if (!mounted) return;
          setFrame(2);
          timeout = setTimeout(() => {
            if (!mounted) return;
            setFrame(3);
            timeout = setTimeout(() => {
              if (!mounted) return;
              setFrame(2);
              timeout = setTimeout(() => {
                if (!mounted) return;
                setFrame(1);
                // Random pause (eyes open) before the next blink
                timeout = setTimeout(scheduleBlink, 2800 + Math.round(Math.random() * 1800));
              }, 110);
            }, 110);
          }, 130);
        }, 360); // eyes open longer
      };

      if (active) {
        setFrame(1); // default: eyes open
        scheduleBlink();
      } else {
        setFrame(3); // default: without eyes
      }

      return () => {
        mounted = false;
        if (timeout) clearTimeout(timeout);
      };
    }, [active]);

    const src = active
      ? (frame === 1 ? '/assets/stars/star1.png' : frame === 2 ? '/assets/stars/star2.png' : '/assets/stars/star3.png')
      : '/assets/stars/star-disabled.png';

    return (
      <img
        src={src}
        alt={active ? 'star active' : 'star inactive'}
        style={{ height: '40px', width: 'auto', display: 'block' }}
      />
    );
  };

  useEffect(() => {
    const playerPseudo = localStorage.getItem('playerPseudo') || 'Joueur';
    setPseudo(playerPseudo);

   
    const fromStorage = parseInt(localStorage.getItem('gameScore') || '0');
    setScore(fromStorage);
  }, [searchParams]);

  useEffect(() => {
    if (!pseudo) return;
    let aborted = false;
    fetch(`/api/rating?name=${encodeURIComponent(pseudo)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((data) => {
        if (aborted) return;
        const initial = typeof data?.rating === 'number' ? data.rating : 0;
        setRating(initial);
        setRatingSubmitted(initial > 0);
      })
      .catch(() => {});
    return () => { aborted = true; };
  }, [pseudo]);

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
      padding: '2rem',
      overflow: 'hidden'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
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

        {/* Rating section placed clearly between score card and scoreboard */}
        <div style={{
          width: '100%',
          maxWidth: '560px',
          background: 'rgba(231, 233, 255, 0.08)',
          borderRadius: '16px',
          border: '2px solid rgba(231, 233, 255, 0.18)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
          marginTop: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{ color: '#e7e9ff', opacity: 0.9, fontWeight: 'bold' }}>Donnez une note au jeu</div>
          <div style={{ display: 'flex', gap: '0.75rem' }} onMouseLeave={() => setHoverRating(null)}>
            {[1,2,3,4,5].map((i) => {
              const effective = (hoverRating != null && hoverRating > rating) ? hoverRating : rating;
              const active = effective >= i;
               return (
                <button
                   key={i}
                  onMouseEnter={() => setHoverRating(i > rating ? i : null)}
                  onClick={() => {
                    fetch('/api/rating', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: pseudo, rating: i })
                    })
                      .then(async (res) => {
                        if (!res.ok) {
                          const data = await res.json().catch(() => ({}));
                          if (res.status === 409) {
                            setShowRatingWarning(true);
                          } else {
                            console.warn('Failed to save rating', data?.error || res.statusText);
                          }
                        } else {
                          setRating(i);
                          setRatingSubmitted(true);
                        }
                      })
                      .catch((err) => {
                        console.warn('Error saving rating', err);
                      });
                  }}
                   style={{
                     width: '40px',
                     height: '40px',
                     padding: 0,
                     border: 'none',
                    background: 'transparent',
                    cursor: 'pointer'
                   }}
                   aria-label={`Note ${i}`}
                  
                 >
                   <StarIcon active={active} />
                 </button>
               );
             })}
          </div>
          {ratingSubmitted && (
            <div style={{ color: '#66bfff' }}>Merci pour votre note !</div>
          )}
        </div>

        {showRatingWarning && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#1a1a3a',
              border: '2px solid rgba(231, 233, 255, 0.2)',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '440px',
              width: '92%',
              color: '#e7e9ff',
              boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
            }}>
              <h2 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.4rem', fontWeight: 'bold', color: '#ffd166' }}>
                Note déjà enregistrée
              </h2>
              <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.5 }}>
                Vous avez déjà noté le jeu.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  onClick={() => setShowRatingWarning(false)}
                  style={{
                    padding: '0.6rem 1.1rem',
                    background: '#e7e9ff',
                    color: '#040218',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '0.5rem'
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


