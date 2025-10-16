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

            // Update best score if improved
            if (Number.isFinite(totalScore) && totalScore > 0) {
              await fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: pseudo, score: Math.trunc(totalScore) })
              }).catch(() => {});
            }
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
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4, padding: '16px' }}>
            <div style={{ position: 'relative', width: '540px', maxWidth: '92vw' }}>
              <img src="/assets/ui/scoreboard/scoreboard-title-background.png" alt="support" style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8%' }}>
                <div style={{ textAlign: 'center', fontFamily: 'November, sans-serif', fontWeight: 700, fontSize: 'clamp(14px, 2.2vw, 20px)', textShadow: '0 2px 0 rgba(0,0,0,0.25)', lineHeight: 1.8, color: '#b20c0f', transform: 'translateY(-60px)' }}>
                  Partie terminee !<br/>
                  Score: <strong>{gameResults.totalScore}</strong> — Flocons gagnes: <strong>+{gameResults.snowflakesEarned}</strong><br/>
                  Voulez-vous continuer avec des ameliorations ou voir votre score ?
                </div>
              </div>
              {/* Buttons row under the image */}
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '16px' }}>
                <button
                  onClick={handleStop}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'transform 0.12s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                >
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src="/assets/ui/buttons/button-red-up.png"
                      alt="Arrêter"
                      style={{ height: '110px', width: 'auto', display: 'block' }}
                      onMouseDown={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-red-down.png'; }}
                      onMouseUp={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-red-up.png'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-red-up.png'; }}
                    />
                    <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', color: '#ffffff', fontSize: '1.3rem', fontWeight: 'bold', fontFamily: 'November, sans-serif', textTransform: 'uppercase', transform: 'translateY(-2px)' }}>Arreter</span>
                  </div>
                </button>
                <button
                  onClick={handleContinue}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'transform 0.12s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                >
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src="/assets/ui/buttons/button-green-up.png"
                      alt="Continuer"
                      style={{ height: '110px', width: 'auto', display: 'block' }}
                      onMouseDown={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-green-down.png'; }}
                      onMouseUp={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-green-up.png'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-green-up.png'; }}
                    />
                    <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', color: '#ffffff', fontSize: '1.3rem', fontWeight: 'bold', fontFamily: 'November, sans-serif', textTransform: 'uppercase', transform: 'translateY(-2px)' }}>Continuer</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
}


