'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <main style={{ 
      minHeight: '100vh', 
      height: '100vh', 
      background: '#040218',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem'
    }}>
      <h1 style={{ 
        fontSize: '4rem', 
        fontWeight: 'bold', 
        color: '#e7e9ff',
        margin: 0,
        textAlign: 'center'
      }}>
        Catch Game
      </h1>
      
      <button
        onClick={() => router.push('/pseudo')}
        style={{
          padding: '1.2rem 3rem',
          fontSize: '1.5rem',
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
        Commencer le jeu
      </button>
    </main>
  );
}
