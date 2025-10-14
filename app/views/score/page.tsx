'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DisplayScorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pseudo, setPseudo] = useState('');
  const [score, setScore] = useState(0);
  const postedRef = useRef(false);

  useEffect(() => {
    const playerPseudo = localStorage.getItem('playerPseudo') || 'Joueur';
    setPseudo(playerPseudo);

   
    const urlScore = searchParams.get('score');
    const finalScore = urlScore ? parseInt(urlScore) : parseInt(localStorage.getItem('gameScore') || '0');
    setScore(finalScore);
  }, [searchParams]);

  useEffect(() => {
    if (postedRef.current) return;
    if (!pseudo || !Number.isFinite(score)) return;

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

  return (
    <main style={{ 
      minHeight: '100vh', 
      height: '100vh', 
      background: '#040218',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2.5rem',
      padding: '2rem'
    }}>
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
    </main>
  );
}


