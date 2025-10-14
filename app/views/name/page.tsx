'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GetNamePage() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pseudo.trim()) {
      localStorage.setItem('playerPseudo', pseudo.trim());
      router.push('/views/game');
    }
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
    </main>
  );
}


