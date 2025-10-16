'use client';

import { useEffect, useState } from 'react';
import TitleBanner from '@/app/components/TitleBanner';
import UiImageButton from '@/app/components/UiImageButton';
import { AbilityManager, AbilityUpgrade } from '../../utils/abilities';
import { useFakeLoading } from '@/app/hooks/useFakeLoading';
import { LoadingCard } from '@/app/components/LoadingCard';

interface AbilityUpgradePageProps {
  onContinue: () => void;
  snowflakesEarned: number;
  totalScore: number;
}

export function AbilityUpgradeView({ onContinue, snowflakesEarned, totalScore }: AbilityUpgradePageProps) {
  const [abilityManager] = useState(() => AbilityManager.getInstance());
  const [abilities, setAbilities] = useState<AbilityUpgrade[]>([]);
  const [totalSnowflakes, setTotalSnowflakes] = useState(0);
  const [showUpgradeEffect, setShowUpgradeEffect] = useState<string | null>(null);
  const { isLoading, dots, startLoading, finishLoading } = useFakeLoading();

  useEffect(() => {
    startLoading();
    
    let aborted = false;
    const pseudo = (typeof window !== 'undefined' ? localStorage.getItem('playerPseudo') : '') || '';

    const load = async () => {
      try {
        if (!pseudo) return;
        const res = await fetch(`/api/abilities?name=${encodeURIComponent(pseudo)}`, { 
          cache: 'no-store' 
        });
        if (!res.ok) return;
        const data = await res.json();
        if (aborted) return;
        abilityManager.setTotalSnowflakesFromServer(data?.totalSnowflakes || 0);
        abilityManager.setAllStagesFromServer(data?.abilities || {});
      } catch {}
    };

    const init = async () => {
      try {
        abilityManager.addGamePlayed(totalScore);
        await load();
      } finally {
        if (!aborted) {
          setAbilities(abilityManager.getAbilities());
          setTotalSnowflakes(abilityManager.getTotalSnowflakes());
        }
      }
    };

    init().finally(() => {
      finishLoading();
    });
    
    return () => { 
      aborted = true; 
    };
  }, [abilityManager, snowflakesEarned, totalScore]); // Retiré startLoading et finishLoading des dépendances

  const handleUpgrade = async (abilityId: string) => {
    // Guard against client-side over-leveling
    const ability = abilities.find(a => a.id === abilityId);
    if (!ability) return;
    if (ability.currentStage >= ability.stages.length) return;

    const pseudo = (typeof window !== 'undefined' ? localStorage.getItem('playerPseudo') : '') || '';
    if (!pseudo) return;

    const res = await fetch('/api/abilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: pseudo, abilityId })
    }).catch(() => null);

    if (!res || !res.ok) {
      return;
    }
    const data = await res.json().catch(() => null);
    if (!data || !data.ok) return;

    // Extra safety: cap new stage to max
    const maxStage = ability.stages.length;
    const serverStage = Math.min(maxStage, Math.max(0, Number(data.newStage || 0)));
    abilityManager.setAbilityStageFromServer(abilityId, serverStage);
    abilityManager.setTotalSnowflakesFromServer(data.totalSnowflakes);
    setAbilities([...abilityManager.getAbilities()]);
    setTotalSnowflakes(abilityManager.getTotalSnowflakes());

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
      {/* Header using shared TitleBanner with reduced font size for long text */}
      <TitleBanner
        text={`Flocons gagnes: +${snowflakesEarned}`}
        subtitleText={`Total: ${totalSnowflakes}`}
        backgroundSrc="/assets/ui/abilities/abilities-menu/title-background copy.png"
        fixedTop={true}
        topOffsetPx={40}
        fontSizeRem={1.6}
        subtitleFontSizeRem={1.6}
      />
      {/* Spacer to avoid content passing under the fixed banner */}
      <div style={{ height: '180px' }} />

      {/* Loading or Abilities Content */}
      {isLoading ? (
        <LoadingCard 
          isLoading={isLoading}
          dots={dots}
          title="Chargement des capacites"
          subtitle="Synchronisation avec le serveur..."
        />
      ) : (
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
                <UiImageButton
                  imageUpSrc="/assets/ui/buttons/button-red-up.png"
                  imageDownSrc="/assets/ui/buttons/button-red-down.png"
                  label={canUpgrade
                    ? `${ability.cost[ability.currentStage]}`
                    : `${ability.cost[ability.currentStage] - totalSnowflakes} flocons manquants`}
                  heightPx={120}
                  onClick={() => canUpgrade && handleUpgrade(ability.id)}
                  disabled={!canUpgrade}
                  cooldownAfterClickMs={2000}
                  disableAnimationsWhenDisabled={true}
                  ariaLabel="Upgrade"
                  style={{
                    opacity: canUpgrade ? 1 : 0.55,
                    filter: canUpgrade ? 'none' : 'grayscale(20%)',
                    cursor: canUpgrade ? 'pointer' : 'not-allowed'
                  }}
                />
              )}

              {isMaxed && (
                <UiImageButton
                  imageUpSrc="/assets/ui/buttons/button-red-up.png"
                  imageDownSrc="/assets/ui/buttons/button-red-up.png"
                  label="MAXIMUM"
                  heightPx={120}
                  onClick={() => {}}
                  ariaLabel="Maxed"
                  style={{
                    opacity: 0.75,
                    filter: 'grayscale(15%)',
                    cursor: 'not-allowed'
                  }}
                  disabled={true}
                  disableAnimationsWhenDisabled={true}
                />
              )}
            </div>
          );
          })}
          </div>

          {/* Sidebar Right (removed from flow; button fixed on screen) */}
        </div>
      )}

      {/* Fixed Continue Button on the right */}
      <UiImageButton
        imageUpSrc="/assets/ui/buttons/button-red-up.png"
        imageDownSrc="/assets/ui/buttons/button-red-down.png"
        label="Continuer"
        heightPx={160}
        onClick={onContinue}
        ariaLabel="Continuer"
        style={{
          position: 'fixed',
          top: '62%',
          right: '50px',
          transform: 'translateY(-50%)',
          zIndex: 10
        }}
      />
    </div>
  );
}


