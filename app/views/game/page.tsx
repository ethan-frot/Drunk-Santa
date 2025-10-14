'use client';

import { useRouter } from 'next/navigation';
import GameCanvas from '../../components/GameCanvas';

export default function DisplayGamePage() {
    const router = useRouter();
    
    return (
      <main style={{ minHeight: '100vh', height: '100vh', background: '#040218' }}>
        <GameCanvas onGameEnd={() => {
          // save score in localStorage (0 for now, then add score system)
          localStorage.setItem('gameScore', '0');
          router.push('/views/score?score=0');
        }} />
      </main>
    );
}


