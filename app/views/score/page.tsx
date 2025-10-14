'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DisplayScorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pseudo, setPseudo] = useState('');
  const [score, setScore] = useState(0);

  useEffect(() => {
    const playerPseudo = localStorage.getItem('playerPseudo') || 'Joueur';
    setPseudo(playerPseudo);

   
    const urlScore = searchParams.get('score');
    const finalScore = urlScore ? parseInt(urlScore) : parseInt(localStorage.getItem('gameScore') || '0');
    setScore(finalScore);
  }, [searchParams]);

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
        gap: '1.5rem',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => router.push('/views/game')}
          style={{
            padding: '1rem 2.5rem',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            color: '#040218',
            background: '#e7e9ff',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.background = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = '#e7e9ff';
          }}
        >
          Rejouer
        </button>

        <button
          onClick={() => router.push('/')}
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


