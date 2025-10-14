'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GameCanvas from '../../components/GameCanvas';
import AbilityUpgradePage from '../abilities/page';

export default function DisplayGamePage() {
    const router = useRouter();
    const [showAbilityPage, setShowAbilityPage] = useState(false);
    const [gameResults, setGameResults] = useState<{snowflakesEarned: number, totalScore: number} | null>(null);
    const [runId, setRunId] = useState(0); // forces GameCanvas remount
    
    const handleGameEnd = (snowflakesEarned: number, totalScore: number) => {
        // Save score in localStorage
        localStorage.setItem('gameScore', totalScore.toString());
        localStorage.setItem('snowflakesEarned', snowflakesEarned.toString());
        
        // Show ability upgrade page
        setGameResults({ snowflakesEarned, totalScore });
        setShowAbilityPage(true);
    };

    const handleContinue = () => {
        // Hide ability page and start a fresh game immediately
        setShowAbilityPage(false);
        setRunId((id) => id + 1); // remount GameCanvas to start new Phaser instance
    };

    const handleSkipToScore = () => {
        // Skip ability page and go directly to score
        router.push(`/views/score?score=${gameResults?.totalScore || 0}`);
    };
    
    if (showAbilityPage && gameResults) {
        return (
            <AbilityUpgradePage 
                onContinue={handleContinue}
                snowflakesEarned={gameResults.snowflakesEarned}
                totalScore={gameResults.totalScore}
            />
        );
    }
    
    return (
      <main style={{ minHeight: '100vh', height: '100vh', background: '#040218' }}>
        <GameCanvas onGameEnd={(finalScore) => {
          localStorage.setItem('gameScore', String(finalScore));
          router.push('/views/score');
        }} />
      </main>
    );
}


