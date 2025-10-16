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
    const [showEndModal, setShowEndModal] = useState(false);
    
    const handleGameEnd = (snowflakesEarned: number, totalScore: number) => {
        // Save results
        localStorage.setItem('gameScore', totalScore.toString());
        localStorage.setItem('snowflakesEarned', snowflakesEarned.toString());
        setGameResults({ snowflakesEarned, totalScore });
        // Open choice modal (game will be paused automatically)
        setShowEndModal(true);

        // Immediately persist absolute total from server current value to avoid cross-user mixing
        (async () => {
          try {
            const pseudo = localStorage.getItem('playerPseudo') || '';
            if (!pseudo) return;
            const getRes = await fetch(`/api/abilities?name=${encodeURIComponent(pseudo)}`, { cache: 'no-store' }).catch(() => null);
            const currentTotal = getRes && getRes.ok ? (await getRes.json().catch(() => ({}))).totalSnowflakes || 0 : 0;
            const absoluteTotal = Math.max(0, Math.trunc(currentTotal) + Math.trunc(snowflakesEarned));
            await fetch('/api/snowflakes', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: pseudo, total: absoluteTotal })
            }).catch(() => {});
          } catch {}
        })();
    };

    const handleContinue = () => {
        // From modal, go to ability upgrade screen
        setShowEndModal(false);
        setShowAbilityPage(true);
    };

    const handleStop = () => {
        // From modal, go to score page
        setShowEndModal(false);
        router.push('/views/score');
    };

    const handleUpgradesContinueToGame = () => {
        // After upgrades, return to the game
        setShowAbilityPage(false);
        // Start a fresh game
        setRunId((id) => id + 1);
    };
    
    if (showAbilityPage && gameResults) {
        return (
            <AbilityUpgradePage 
                onContinue={handleUpgradesContinueToGame}
                snowflakesEarned={gameResults.snowflakesEarned}
                totalScore={gameResults.totalScore}
            />
        );
    }
    
    return (
      <main style={{ minHeight: '100vh', height: '100vh', background: '#040218' }}>
        <GameCanvas key={runId} onGameEnd={handleGameEnd} isPaused={showEndModal} />

        {showEndModal && gameResults && (
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
                Partie terminée
              </h2>
              <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.5 }}>
                Score: <strong>{gameResults.totalScore}</strong> — Flocons gagnés: <strong>+{gameResults.snowflakesEarned}</strong>
              </p>
              <p style={{ marginTop: '0.75rem', opacity: 0.9 }}>Voulez-vous continuer avec des améliorations ou voir votre score ?</p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleStop}
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
                  Arrêter et voir le score
                </button>
                <button
                  onClick={handleContinue}
                  style={{
                    padding: '0.6rem 1.1rem',
                    background: 'linear-gradient(45deg,rgb(0, 145, 255),rgb(0, 89, 254))',
                    color: '#e7e9ff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Continuer avec upgrades
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
}


