'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TitleBanner from '@/app/components/TitleBanner';
import { renderAlternating } from '@/app/utils/renderAlternating';

function ScoreView() {
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
        style={{ height: '65px', width: 'auto', display: 'block' }}
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

  // using shared renderAlternating

  return (
    <main style={{ 
      minHeight: '100vh', 
      height: '100vh', 
      background: 'url(/assets/ui/background-menu.gif) center/cover no-repeat',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.5rem',
      padding: '2rem',
      overflow: 'hidden'
    }}>
      <div style={{ width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <TitleBanner text="Partie finie" backgroundSrc="/assets/ui/main-menu/title-background.png" />
        <div style={{ height: '180px' }} />

        <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '800px',
        padding: '4rem 3rem',
        backgroundImage: "url('/assets/ui/score/scoreboard/engame-background.png')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        imageRendering: 'pixelated',
        minHeight: '500px'
        }}>
          {/* Joueur section */}
          <div style={{
          width: '100%',
          height: '80px',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '2rem'
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              fontFamily: 'November, sans-serif',
              textAlign: 'center'
            }}>
              {renderAlternating(`Joueur: ${pseudo}`, true)}
            </div>
          </div>

          {/* Score section */}
          <div style={{
          width: '100%',
          height: '80px',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '3rem'
          }}>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              fontFamily: 'November, sans-serif',
              textAlign: 'center'
            }}>
              {renderAlternating(`Score: ${score}`, false)}
            </div>
          </div>

          {/* Rating section inside the background */}
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem'
          }}>
            <div style={{ 
              opacity: 0.9, 
              fontWeight: 'bold', 
              fontSize: '1.4rem',
              fontFamily: 'November, sans-serif'
            }}>
              {renderAlternating('Donnez une note au jeu', true)}
            </div>
            <div style={{ display: 'flex', gap: '1.2rem' }} onMouseLeave={() => setHoverRating(null)}>
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
                       width: '65px',
                       height: '65px',
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
              <div style={{ fontSize: '1.2rem', fontFamily: 'November, sans-serif' }}>
                {renderAlternating('Merci pour votre note !', false)}
              </div>
            )}
          </div>
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

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem', gap: '1rem' }}>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('playerPseudo');
                localStorage.removeItem('gameScore');
              } catch {}
              router.push('/');
            }}
            style={{
              background: 'transparent',
              backgroundImage: "url('/assets/ui/buttons/home-button-up.png')",
              backgroundRepeat: 'no-repeat',
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              imageRendering: 'pixelated',
              border: 'none',
              cursor: 'pointer',
              width: '100px',
              height: '80px',
              transform: 'scale(1.5)',
              transition: 'transform 80ms ease-out'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.backgroundImage = "url('/assets/ui/buttons/home-button-down.png')";
              e.currentTarget.style.transform = 'scale(1.5) translateY(2px)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.backgroundImage = "url('/assets/ui/buttons/home-button-up.png')";
              e.currentTarget.style.transform = 'scale(1.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundImage = "url('/assets/ui/buttons/home-button-up.png')";
              e.currentTarget.style.transform = 'scale(1.5)';
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.6)';
            }}
          />
        </div>
      </div>
    </main>
  );
}

export default function DisplayScorePage() {
  return (
    <Suspense fallback={null}>
      <ScoreView />
    </Suspense>
  );
}