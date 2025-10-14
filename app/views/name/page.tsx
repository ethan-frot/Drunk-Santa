'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GetNamePage() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [matchedExistingName, setMatchedExistingName] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = pseudo.trim();
    if (!entered) return;

    try {
      const res = await fetch('/api/players', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch players');
      const names: string[] = await res.json();
      const lower = entered.toLowerCase();
      const match = names.find((n) => n.toLowerCase() === lower) || null;
      if (match) {
        setMatchedExistingName(match);
        setShowWarning(true);
        return;
      }
    } catch {
      // On error, continue with entered name rather than blocking play
    }

    localStorage.setItem('playerPseudo', entered);
    router.push('/views/game');
  };

  const confirmUseExisting = () => {
    const nameToUse = matchedExistingName || pseudo.trim();
    localStorage.setItem('playerPseudo', nameToUse);
    setShowWarning(false);
    router.push('/views/game');
  };

  const cancelUseExisting = () => {
    setShowWarning(false);
  };

  return (
    <main style={{ 
      minHeight: '100vh', 
      height: '100vh', 
      background: '#040218',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem',
      padding: '2rem'
    }}>
      <h1 style={{ 
        fontSize: '3rem', 
        fontWeight: 'bold', 
        color: '#e7e9ff',
        margin: 0,
        textAlign: 'center'
      }}>
        Rentrer le pseudo
      </h1>
      
      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        alignItems: 'center',
        width: '100%',
        maxWidth: '400px'
      }}>
        <input
          type="text"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="Votre pseudo"
          style={{
            width: '100%',
            padding: '1rem 1.5rem',
            fontSize: '1.2rem',
            color: '#040218',
            background: '#e7e9ff',
            border: 'none',
            borderRadius: '12px',
            outline: 'none',
            textAlign: 'center'
          }}
          maxLength={20}
          autoFocus
        />
        
        <button
          type="submit"
          disabled={!pseudo.trim()}
          style={{
            padding: '1rem 3rem',
            fontSize: '1.3rem',
            fontWeight: 'bold',
            color: '#040218',
            background: pseudo.trim() ? '#e7e9ff' : '#666',
            border: 'none',
            borderRadius: '12px',
            cursor: pseudo.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            opacity: pseudo.trim() ? 1 : 0.5
          }}
          onMouseEnter={(e) => {
            if (pseudo.trim()) {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.background = '#fff';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = pseudo.trim() ? '#e7e9ff' : '#666';
          }}
        >
          Commencer
        </button>
      </form>

      {showWarning && (
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
            padding: '2rem',
            maxWidth: '480px',
            width: '92%',
            color: '#e7e9ff',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
          }}>
            <h2 style={{
              margin: 0,
              marginBottom: '0.75rem',
              fontSize: '1.6rem',
              fontWeight: 'bold',
              color: '#ffd166'
            }}>
              Attention
            </h2>
            <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.5 }}>
              Le pseudo "{pseudo.trim()}" correspond déjà à un joueur existant ({matchedExistingName}).
              Voulez-vous jouer en utilisant cette session existante ?
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={cancelUseExisting}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'transparent',
                  color: '#e7e9ff',
                  border: '2px solid rgba(231, 233, 255, 0.4)',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                Modifier le pseudo
              </button>
              <button
                onClick={confirmUseExisting}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: '#e7e9ff',
                  color: '#040218',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Continuer avec ce compte
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


