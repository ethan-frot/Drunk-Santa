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
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#e7e9ff',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: '48px', 
          margin: '0 0 10px 0',
          background: 'linear-gradient(45deg,rgb(0, 145, 255),rgb(0, 89, 254))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 20px rgba(0, 229, 255, 0.5)'
        }}>
          🎁 Ability Upgrades
        </h1>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>
          Snowflakes Earned: <span style={{ color: '#00ff88', fontWeight: 'bold' }}>+{snowflakesEarned}</span>
        </div>
        <div style={{ fontSize: '20px', color: '#ffd700' }}>
          Total Snowflakes: <span style={{ fontWeight: 'bold' }}>{totalSnowflakes}</span>
        </div>
      </div>

      {/* Abilities Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        maxWidth: '1000px',
        width: '100%',
        marginBottom: '40px'
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
                padding: '20px',
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
                margin: '0 0 15px 0',
                lineHeight: '1.4'
              }}>
                {ability.description}
              </p>

              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '16px', marginBottom: '5px' }}>
                  Current: <span style={{ color: '#00ff88', fontWeight: 'bold' }}>
                    {formatValue(ability.id, currentValue)}
                  </span>
                </div>
                {nextValue && (
                  <div style={{ fontSize: '16px' }}>
                    Next: <span style={{ color: '#ffd700', fontWeight: 'bold' }}>
                      {formatValue(ability.id, nextValue)}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ fontSize: '14px', marginBottom: '15px' }}>
                Stage: {ability.currentStage}/{ability.stages.length}
              </div>

              {!isMaxed && (
                <button
                  onClick={() => handleUpgrade(ability.id)}
                  disabled={!canUpgrade}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: canUpgrade ? 'pointer' : 'not-allowed',
                    background: canUpgrade 
                      ? 'linear-gradient(45deg,rgb(0, 145, 255),rgb(0, 89, 254))'
                      : 'rgba(100, 100, 100, 0.5)',
                    color: canUpgrade ? '#1a1a2e' : '#666',
                    transition: 'all 0.3s ease',
                    transform: canUpgrade ? 'scale(1)' : 'scale(0.95)'
                  }}
                  onMouseEnter={(e) => {
                    if (canUpgrade) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (canUpgrade) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {canUpgrade 
                    ? `Upgrade - ${ability.cost[ability.currentStage]} Snowflakes`
                    : `Need ${ability.cost[ability.currentStage] - totalSnowflakes} more`
                  }
                </button>
              )}

              {isMaxed && (
                <div style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  background: 'linear-gradient(45deg,rgb(0, 145, 255),rgb(0, 89, 254))',
                  color: '#1a1a2e',
                  textAlign: 'center'
                }}>
                  ✨ MAXED OUT ✨
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        style={{
          padding: '15px 40px',
          fontSize: '20px',
          fontWeight: 'bold',
          borderRadius: '10px',
          border: 'none',
          cursor: 'pointer',
          background: 'linear-gradient(45deg, #00ff88, #00cc6a)',
          color: '#1a1a2e',
          transition: 'all 0.3s ease',
          boxShadow: '0 4px 15px rgba(0, 255, 136, 0.3)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.3)';
        }}
      >
        Continue Playing 🎮
      </button>
    </div>
  );
}
