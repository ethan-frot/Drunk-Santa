'use client';

import { useRouter } from 'next/navigation';
import GameCanvas from '../../components/GameCanvas';

export default function DisplayGamePage() {
    const router = useRouter();
    
    return (
      <main style={{ minHeight: '100vh', height: '100vh', background: '#040218' }}>
        <GameCanvas onGameEnd={(finalScore) => {
          localStorage.setItem('gameScore', String(finalScore));
          router.push(`/views/score?score=${encodeURIComponent(finalScore)}`);
        }} />
      </main>
    );
}


