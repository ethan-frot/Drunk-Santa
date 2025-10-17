'use client';

import React from 'react';
import ImageModal from '@/app/components/ImageModal';
import MusicManager from '@/app/utils/musicManager';
import { renderAlternating } from '@/app/utils/renderAlternating';

interface MusicConsentModalProps {
  onClose: () => void;
}

export default function MusicConsentModal({ onClose }: MusicConsentModalProps) {
  const handleMusicEnable = () => {
    // Enable music
    MusicManager.getInstance().setMusicEnabled(true);
    MusicManager.getInstance().playMenuMusic();
    
    // Close the modal
    onClose();
  };

  const handleMusicDisable = () => {
    // Disable the music
    MusicManager.getInstance().setMusicEnabled(false);
    
    // Close the modal
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <ImageModal
        backgroundSrc="/assets/ui/scoreboard/scoreboard-title-background.png"
        offsetTopPercent={32}
        content={
          <div style={{ textAlign: 'center', fontFamily: 'November, sans-serif', fontWeight: 700, fontSize: 'clamp(14px, 2.2vw, 20px)', textShadow: '0 2px 0 rgba(0,0,0,0.25)', lineHeight: 1.8 }}>
            <div style={{ marginBottom: '20px' }}>
              🎵 {renderAlternating('Musique du jeu', true)}
            </div>
            <div style={{ color: '#b20c0f' }}>
              Ce jeu contient de la musique de fond.<br/>
              Souhaitez-vous l'activer ?
            </div>
          </div>
        }
        buttons={[
          {
            imageUpSrc: "/assets/ui/buttons/button-red-up.png",
            imageDownSrc: "/assets/ui/buttons/button-red-down.png",
            label: "PASSER",
            heightPx: 160,
            onClick: handleMusicDisable,
            ariaLabel: "Passer (désactiver la musique)"
          },
          {
            imageUpSrc: "/assets/ui/buttons/button-green-up.png",
            imageDownSrc: "/assets/ui/buttons/button-green-down.png",
            label: "ACTIVER",
            heightPx: 110,
            onClick: handleMusicEnable,
            ariaLabel: "Activer la musique"
          }
        ]}
        widthPx={600}
      />
    </div>
  );
}
