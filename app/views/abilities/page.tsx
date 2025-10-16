'use client';

import { useState, useEffect } from 'react';
import { AbilityManager, AbilityUpgrade } from '../../utils/abilities';

interface AbilityUpgradePageProps {
  onContinue: () => void;
  snowflakesEarned: number;
  totalScore: number;
}

export default function AbilityUpgradePage({ onContinue, snowflakesEarned, totalScore }: AbilityUpgradePageProps) {
  const [abilityManager] = useState(() => AbilityManager.getInstance());
  const [abilities, setAbilities] = useState<AbilityUpgrade[]>([]);
  const [totalSnowflakes, setTotalSnowflakes] = useState(0);
  const [showUpgradeEffect, setShowUpgradeEffect] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    const pseudo = (typeof window !== 'undefined' ? localStorage.getItem('playerPseudo') : '') || '';

    const load = async () => {
      try {
        if (!pseudo) return;
        const res = await fetch(`/api/abilities?name=${encodeURIComponent(pseudo)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (aborted) return;
        // Sync client with server state
        abilityManager.setTotalSnowflakesFromServer(data?.totalSnowflakes || 0);
        abilityManager.setAllStagesFromServer(data?.abilities || {});
      } catch {}
    };

    const init = async () => {
      try {
        // update local stats for gameplay history
        abilityManager.addGamePlayed(totalScore);
        // perform server sync
        await load();
      } finally {
        if (!aborted) {
          setAbilities(abilityManager.getAbilities());
          setTotalSnowflakes(abilityManager.getTotalSnowflakes());
        }
      }
    };

    init();
    return () => { aborted = true; };
  }, [abilityManager, snowflakesEarned, totalScore]);

  const handleUpgrade = async (abilityId: string) => {
    const pseudo = (typeof window !== 'undefined' ? localStorage.getItem('playerPseudo') : '') || '';
    if (!pseudo) return;

    // Request server to purchase the upgrade
    const res = await fetch('/api/abilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pseudo, abilityId })
    }).catch(() => null);

    if (!res || !res.ok) {
      // optionally show an error toast later
      return;
    }
    const data = await res.json().catch(() => null);
    if (!data || !data.ok) return;

    // Reflect new stage and snowflakes locally
    abilityManager.setAbilityStageFromServer(abilityId, data.newStage);
    abilityManager.setTotalSnowflakesFromServer(data.totalSnowflakes);
    setAbilities([...abilityManager.getAbilities()]);
    setTotalSnowflakes(abilityManager.getTotalSnowflakes());

    // Show upgrade effect
    setShowUpgradeEffect(abilityId);
    setTimeout(() => setShowUpgradeEffect(null), 1000);
  };

  const getCurrentValue = (ability: AbilityUpgrade): number => {
    if (ability.currentStage === 0) {
      return ability.baseValue;
    }
    return ability.stages[ability.currentStage - 1];
  };

  const getNextValue = (ability: AbilityUpgrade): number | null => {
    if (ability.currentStage >= ability.stages.length) return null;
    return ability.stages[ability.currentStage];
  };

  const formatValue = (abilityId: string, value: number): string => {
    switch (abilityId) {
      case 'movement_speed':
        return `${value} px/s`;
      case 'bonus_size':
        return `${Math.round(value * 100)}%`;
      case 'dash_cooldown':
        return `${value / 1000}s`;
      case 'snowflake_value':
        return `${value} pts`;
      default:
        return value.toString();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundImage: "url('/assets/ui/background-menu.gif')",
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#e7e9ff',
      fontFamily: 'November, sans-serif',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div
          style={{
            width: '640px',
            height: '160px',
            backgroundImage: "url('/assets/ui/abilities/abilities-menu/title-background copy.png')",
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '10px auto 0',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', transform: 'translateY(-14px)' }}>
            <div style={{ fontSize: '24px', color: '#ED1C24' }}>
            Flocons gagnes : <span style={{ color: '#ED1C24', fontWeight: 'bold' }}>+{snowflakesEarned}</span>
            </div>
            <div style={{ fontSize: '20px', color: '#ED1C24' }}>
            Total : <span style={{ fontWeight: 'bold' }}>{totalSnowflakes}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Abilities + Sidebar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        width: '100%',
        maxWidth: '1200px',
        margin: ' 20px'
      }}>
        {/* Abilities Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          maxWidth: '800px',
          width: '100%'
        }}>
        {abilities.map((ability) => {
          const canUpgrade = abilityManager.canUpgrade(ability.id);
          const currentValue = getCurrentValue(ability);
          const nextValue = getNextValue(ability);
          const isMaxed = ability.currentStage >= ability.stages.length;
          const isUpgrading = showUpgradeEffect === ability.id;

          return (
            <div
              key={ability.id}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '15px',
                padding: '15px 15px 0px 15px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                transform: isUpgrading ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s ease',
                boxShadow: isUpgrading ? '0 0 30px rgba(255, 215, 0, 0.5)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
                textAlign: 'center'
              }}
            >
              <h3 style={{ 
                fontSize: '24px', 
                margin: '0 0 10px 0',
                color: isMaxed ? '#ffd700' : '#e7e9ff'
              }}>
                {ability.name}
                {isMaxed && <span style={{ marginLeft: '10px' }}>✨</span>}
              </h3>
              
              <p style={{ 
                fontSize: '14px', 
                color: '#b0b0b0', 
                margin: '0 0 10px 0',
                lineHeight: '1.4'
              }}>
                {ability.description}
              </p>

              <div style={{ marginBottom: '10px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  fontSize: '16px'
                }}>
                  <div>
                    Actuel : <span style={{ color: '#00ff88', fontWeight: 'bold' }}>
                      {formatValue(ability.id, currentValue)}
                    </span>
                  </div>
                  {nextValue && (
                    <div>
                      Suivant : <span style={{ color: '#ffd700', fontWeight: 'bold' }}>
                        {formatValue(ability.id, nextValue)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ fontSize: '14px', marginBottom: '10px', textAlign: 'center' }}>
                Niveau : {ability.currentStage}/{ability.stages.length}
              </div>

              {!isMaxed && (
                <button
                  onClick={() => handleUpgrade(ability.id)}
                  disabled={!canUpgrade}
                  style={{
                    position: 'relative',
                    height: '120px',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: canUpgrade ? 'pointer' : 'not-allowed',
                    transition: 'transform 0.12s ease, opacity 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: canUpgrade ? 1 : 0.55,
                    filter: canUpgrade ? 'none' : 'grayscale(20%)',
                    transform: canUpgrade ? 'scale(1)' : 'scale(0.98)'
                  }}
                  onMouseEnter={(e) => {
                    if (canUpgrade) {
                      e.currentTarget.style.transform = 'scale(1.03)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (canUpgrade) {
                      e.currentTarget.style.transform = 'scale(1)';
                      const img = e.currentTarget.querySelector('img');
                      if (img) (img as HTMLImageElement).src = '/assets/ui/buttons/button-red-up.png';
                    }
                  }}
                  onMouseDown={(e) => {
                    if (canUpgrade) {
                      e.currentTarget.style.transform = 'scale(0.98)';
                      const img = e.currentTarget.querySelector('img');
                      if (img) (img as HTMLImageElement).src = '/assets/ui/buttons/button-red-down.png';
                    }
                  }}
                  onMouseUp={(e) => {
                    if (canUpgrade) {
                      e.currentTarget.style.transform = 'scale(1.03)';
                      const img = e.currentTarget.querySelector('img');
                      if (img) (img as HTMLImageElement).src = '/assets/ui/buttons/button-red-up.png';
                    }
                  }}
                >
                  <img
                    src={'/assets/ui/buttons/button-red-up.png'}
                    alt="Upgrade"
                    style={{ height: '120px', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                  />
                  <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', marginBottom: '2px', color: '#ffffff', fontSize: '22px', fontWeight: 'bold', fontFamily: 'November, sans-serif' }}>
                    {canUpgrade
                      ? `${ability.cost[ability.currentStage]}`
                      : `${ability.cost[ability.currentStage] - totalSnowflakes} manquants`}
                  </span>
                </button>
              )}

              {isMaxed && (
                <button
                  disabled
                  style={{
                    position: 'relative',
                    height: '120px',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'not-allowed',
                    opacity: 0.75,
                    filter: 'grayscale(15%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={'/assets/ui/buttons/button-red-up.png'}
                    alt="Maxed"
                    style={{ height: '120px', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
                  />
                  <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-54%)', color: '#ffffff', fontSize: '22px', fontWeight: 'bold', fontFamily: 'November, sans-serif' }}>✨ MAXIMUM ✨</span>
                </button>
              )}
            </div>
          );
        })}
        </div>

        {/* Sidebar Right (removed from flow; button fixed on screen) */}
      </div>

      {/* Fixed Continue Button on the right */}
      <button
        onClick={onContinue}
        style={{
          position: 'fixed',
          top: '62%',
          right: '50px',
          transform: 'translateY(-50%)',
          height: '160px',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          transition: 'transform 0.12s ease',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-50%) scale(1.03)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
          const img = e.currentTarget.querySelector('img');
          if (img) (img as HTMLImageElement).src = '/assets/ui/buttons/button-red-up.png';
          const textSpan = e.currentTarget.querySelector('span');
          if (textSpan) {
            (textSpan as HTMLSpanElement).style.transform = 'translateY(-50%)';
          }
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(-50%) scale(0.98)';
          const img = e.currentTarget.querySelector('img');
          if (img) (img as HTMLImageElement).src = '/assets/ui/buttons/button-red-down.png';
          const textSpan = e.currentTarget.querySelector('span');
          if (textSpan) {
            (textSpan as HTMLSpanElement).style.transform = 'translateY(-46%)';
          }
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translateY(-50%) scale(1.03)';
          const img = e.currentTarget.querySelector('img');
          if (img) (img as HTMLImageElement).src = '/assets/ui/buttons/button-red-up.png';
          const textSpan = e.currentTarget.querySelector('span');
          if (textSpan) {
            (textSpan as HTMLSpanElement).style.transform = 'translateY(-50%)';
          }
        }}
      >
        <img
          src={'/assets/ui/buttons/button-red-up.png'}
          alt="Continuer"
          style={{ height: '160px', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
        />
        <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', marginBottom: '6px', color: '#ffffff', fontSize: '28px', fontWeight: 'bold', fontFamily: 'November, sans-serif', transition: 'transform 0.12s ease' }}>
          Continuer
        </span>
      </button>
    </div>
  );
}
