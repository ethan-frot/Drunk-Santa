'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GameCanvas from '../../components/GameCanvas';
import ImageModal from '@/app/components/ImageModal';
import { renderAlternating } from '@/app/utils/renderAlternating';
import MusicManager from '../../utils/musicManager';
import SoundToggleButton from '@/app/components/SoundToggleButton';

// Prevent static prerender to avoid SSR touching browser APIs
export const dynamic = 'force-dynamic';

export default function DisplayGamePage() {
    const router = useRouter();
    const [gameResults, setGameResults] = useState<{snowflakesEarned: number, totalScore: number} | null>(null);
    const [runId, setRunId] = useState(0); // forces GameCanvas remount
    const [showEndModal, setShowEndModal] = useState(false);
    const [buttonsEnabled, setButtonsEnabled] = useState(false);
    
    // Stop menu music when entering game
    useEffect(() => {
        MusicManager.getInstance().stop();
    }, []);
    
    const handleGameEnd = (snowflakesEarned: number, totalScore: number) => {
        // Save results
        localStorage.setItem('gameScore', totalScore.toString());
        localStorage.setItem('snowflakesEarned', snowflakesEarned.toString());
        setGameResults({ snowflakesEarned, totalScore });
        // Open choice modal (game will be paused automatically)
        setShowEndModal(true);
        // Disable buttons initially
        setButtonsEnabled(false);
        
        // Enable buttons after 2 seconds
        setTimeout(() => {
            setButtonsEnabled(true);
        }, 2000);

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
        // From modal, go to ability upgrade screen (standalone route)
        setShowEndModal(false);
        router.push('/views/abilities');
    };

    const handleStop = () => {
        // From modal, go to score page
        setShowEndModal(false);
        // Resume menu music when going to score page
        MusicManager.getInstance().playMenuMusic();
        router.push('/views/score');
    };

    // When returning from abilities, a fresh game will mount via this page's normal flow
    
    return (
      <main style={{ minHeight: '100vh', height: '100vh', background: '#040218' }}>
        <GameCanvas key={runId} onGameEnd={handleGameEnd} isPaused={showEndModal} />

        {showEndModal && gameResults && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4, padding: '16px' }}>
            <ImageModal
              backgroundSrc="/assets/ui/scoreboard/scoreboard-title-background.png"
              offsetTopPercent={32}
              content={
                <div style={{ 
                  textAlign: 'center', 
                  fontFamily: 'November, sans-serif', 
                  fontWeight: 700, 
                  fontSize: 'clamp(14px, 2.2vw, 20px)', 
                  textShadow: '0 2px 0 rgba(0,0,0,0.25)', 
                  lineHeight: 1.8,
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}>
                  <div style={{ color: '#b20c0f', marginBottom: '6px' }}>Partie terminee !</div>
                  <div>
                    {renderAlternating(`Score: ${gameResults.totalScore}`, true)}
                    <span style={{ color: '#b20c0f' }}> — </span>
                    {renderAlternating(`Flocons gagnes: +${gameResults.snowflakesEarned}`, false)}
                  </div>
                  <div style={{ color: '#b20c0f', marginTop: '6px' }}>Voulez-vous continuer avec des ameliorations ou voir votre score ?</div>
                </div>
              }
              buttons={[
                {
                  imageUpSrc: '/assets/ui/buttons/button-red-up.png',
                  imageDownSrc: '/assets/ui/buttons/button-red-down.png',
                  label: 'Arreter',
                  heightPx: 160,
                  onClick: buttonsEnabled ? handleStop : () => {},
                  disabled: !buttonsEnabled,
                  ariaLabel: 'Arreter',
                },
                {
                  imageUpSrc: '/assets/ui/buttons/button-green-up.png',
                  imageDownSrc: '/assets/ui/buttons/button-green-down.png',
                  label: 'Continuer avec ameliorations',
                  heightPx: 110,
                  onClick: buttonsEnabled ? handleContinue : () => {},
                  disabled: !buttonsEnabled,
                  ariaLabel: 'Continuer',
                },
              ]}
            />
          </div>
        )}
        
        {/* Sound toggle button */}
        <SoundToggleButton
          onToggled={(enabled) => {
            try {
              const w: any = typeof window !== 'undefined' ? window : {};
              const game: any = w.__CATCH_GAME_INSTANCE__;
              const scene: any = game?.scene?.keys?.Game;
              if (!enabled) {
                // If turning sound off in-game, pause any menu music just in case
                try { MusicManager.getInstance().pause(); } catch {}
                // Pause in-scene bg music if running
                if (scene && scene.bgMusic && scene.bgMusic.pause) scene.bgMusic.pause();
              } else {
                // If turning sound on in-game, resume ONLY the in-game music
                if (scene && scene.sound) {
                  try {
                    const soundEnabled = localStorage.getItem('soundEnabled');
                    const musicEnabled = localStorage.getItem('musicEnabled');
                    if (soundEnabled !== 'false' && musicEnabled !== 'false') {
                      if (scene.bgMusic && scene.bgMusic.resume) {
                        scene.bgMusic.resume();
                      } else if (scene.sound.add) {
                        // No existing instance (e.g., started game with sound off): create fresh once
                        scene.bgMusic = scene.sound.add('music', { loop: true, volume: 0.5 });
                        scene.bgMusic.play();
                      }
                    }
                  } catch {}
                }
              }
            } catch {}
          }}
        />
      </main>
    );
  }


