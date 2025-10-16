'use client';

import React, { useState, useEffect } from 'react';
import UiImageButton from './UiImageButton';
import SoundManager from '@/app/utils/soundManager';
import MusicManager from '@/app/utils/musicManager';

type SoundToggleButtonProps = {
  topPx?: number;
  rightPx?: number;
  zIndex?: number;
};

export default function SoundToggleButton({ 
  topPx = 16, 
  rightPx = 16, 
  zIndex = 5 
}: SoundToggleButtonProps) {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  useEffect(() => {
    // Initialize sound state from localStorage
    const soundEnabled = localStorage.getItem('soundEnabled');
    if (soundEnabled !== null) {
      const enabled = soundEnabled === 'true';
      setIsSoundEnabled(enabled);
      SoundManager.getInstance().setSoundEnabled(enabled);
    }
  }, []);

  const handleToggleSound = () => {
    const newState = !isSoundEnabled;
    setIsSoundEnabled(newState);
    
    // Save to localStorage
    localStorage.setItem('soundEnabled', newState.toString());
    
    // Update sound manager
    SoundManager.getInstance().setSoundEnabled(newState);
    
    // Update music manager
    MusicManager.getInstance().setMusicEnabled(newState);
    
    // If disabling sound, stop music
    if (!newState) {
      MusicManager.getInstance().stop();
    } else {
      // If enabling sound, resume music if it was enabled
      MusicManager.getInstance().resumeMusicIfEnabled();
    }
  };

  return (
    <UiImageButton
      imageUpSrc="/assets/ui/buttons/sound-button-up.png"
      imageDownSrc="/assets/ui/buttons/sound-button-down.png"
      heightPx={70}
      ariaLabel={isSoundEnabled ? "Disable sound" : "Enable sound"}
      onClick={handleToggleSound}
      style={{ 
        position: 'fixed', 
        top: `${topPx}px`, 
        right: `${rightPx}px`, 
        width: '140px', 
        height: '70px', 
        background: 'transparent', 
        zIndex, 
        pointerEvents: 'auto',
        // Apply visual filter to indicate disabled state
        filter: isSoundEnabled ? 'none' : 'grayscale(100%) brightness(0.7)',
        opacity: isSoundEnabled ? 1 : 0.6
      }}
    />
  );
}
