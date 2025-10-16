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
    // Add earned snowflakes to the manager
    abilityManager.addSnowflakes(snowflakesEarned);
    abilityManager.addGamePlayed(totalScore);
    
    // Update state
    setAbilities(abilityManager.getAbilities());
    setTotalSnowflakes(abilityManager.getTotalSnowflakes());
  }, [abilityManager, snowflakesEarned, totalScore]);

  const handleUpgrade = (abilityId: string) => {
    if (abilityManager.upgradeAbility(abilityId)) {
      setAbilities([...abilityManager.getAbilities()]);
      setTotalSnowflakes(abilityManager.getTotalSnowflakes());
      
      // Show upgrade effect
      setShowUpgradeEffect(abilityId);
      setTimeout(() => setShowUpgradeEffect(null), 1000);
    }
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
      case 'gift_size':
        return `${(value * 100).toFixed(0)}%`;
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
        <h1 style={{ 
          fontSize: '48px', 
          margin: '0 0 10px 0',
          background: 'white',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          
        }}        >
          🎁 Ameliorations des Abilites
        </h1>
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

      {/* Abilities Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px',
        maxWidth: '800px',
        width: '100%',
        marginBottom: '20px'
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
                padding: '15px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                transform: isUpgrading ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s ease',
                boxShadow: isUpgrading ? '0 0 30px rgba(255, 215, 0, 0.5)' : '0 4px 15px rgba(0, 0, 0, 0.3)'
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
                <div style={{ fontSize: '16px', marginBottom: '5px' }}>
                  Actuel : <span style={{ color: '#00ff88', fontWeight: 'bold' }}>
                    {formatValue(ability.id, currentValue)}
                  </span>
                </div>
                {nextValue && (
                  <div style={{ fontSize: '16px' }}>
                    Suivant : <span style={{ color: '#ffd700', fontWeight: 'bold' }}>
                      {formatValue(ability.id, nextValue)}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '14px', marginBottom: '10px' }}>
                Niveau : {ability.currentStage}/{ability.stages.length}
              </div>

              {!isMaxed && (
                <button
                  onClick={() => handleUpgrade(ability.id)}
                  disabled={!canUpgrade}
                  style={{
                    width: '100%',
                    height: '120px',
                    backgroundImage: "url('/assets/ui/buttons/button-red-up.png')",
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundColor: 'transparent',
                    color: '#ffffff',
                    fontSize: '22px',
                    fontWeight: 'bold',
                    fontFamily: 'November, sans-serif',
                    border: 'none',
                    cursor: canUpgrade ? 'pointer' : 'not-allowed',
                    transition: 'transform 0.12s ease, opacity 0.2s ease',
                    display: 'flex',
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
                      (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-red-up.png')";
                    }
                  }}
                  onMouseDown={(e) => {
                    if (canUpgrade) {
                      e.currentTarget.style.transform = 'scale(0.98)';
                      (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-red-down.png')";
                    }
                  }}
                  onMouseUp={(e) => {
                    if (canUpgrade) {
                      e.currentTarget.style.transform = 'scale(1.03)';
                      (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-red-up.png')";
                    }
                  }}
                >
                  <span style={{ position: 'relative', top: '-4px' }}>
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
                    width: '100%',
                    height: '120px',
                    backgroundImage: "url('/assets/ui/buttons/button-red-up.png')",
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundColor: 'transparent',
                    color: '#ffffff',
                    fontSize: '22px',
                    fontWeight: 'bold',
                    fontFamily: 'November, sans-serif',
                    border: 'none',
                    cursor: 'not-allowed',
                    opacity: 0.75,
                    filter: 'grayscale(15%)'
                  }}
                >
                  <span style={{ position: 'relative', top: '-4px' }}>✨ MAXIMUM ✨</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        style={{
          width: '1200px',
          height: '260px',
          backgroundImage: "url('/assets/ui/buttons/button-red-up.png')",
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundColor: 'transparent',
          color: '#ffffff',
          fontSize: '36px',
          fontWeight: 'bold',
          fontFamily: 'November, sans-serif',
          border: 'none',
          cursor: 'pointer',
          transition: 'transform 0.12s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '8px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.03)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-red-up.png')";
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.98)';
          (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-red-down.png')";
          // Опускаем текст при нажатии
          const textSpan = e.currentTarget.querySelector('span');
          if (textSpan) {
            textSpan.style.transform = 'translateY(12px)';
          }
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1.03)';
          (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-red-up.png')";
          // Возвращаем текст в исходное положение
          const textSpan = e.currentTarget.querySelector('span');
          if (textSpan) {
            textSpan.style.transform = 'translateY(0px)';
          }
        }}
      >
        <span style={{ 
          position: 'relative', 
          top: '-16px',
          transition: 'transform 0.12s ease'
        }}>Continuer
        </span>
      </button>
    </div>
  );
}
