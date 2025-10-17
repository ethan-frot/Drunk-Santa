'use client';

import React, { useState, useEffect, useRef } from 'react';
import UiImageButton, { UiImageButtonHandle } from './UiImageButton';
import SoundManager from '@/app/utils/soundManager';
import MusicManager from '@/app/utils/musicManager';
import GamepadManager from '@/app/utils/gamepadManager';

type SoundToggleButtonProps = {
  topPx?: number;
  rightPx?: number;
  zIndex?: number;
  onToggled?: (enabled: boolean) => void; // optional callback for page-specific behavior
};

export default function SoundToggleButton({ 
  topPx = 16, 
  rightPx = 16, 
  zIndex = 5,
  onToggled
}: SoundToggleButtonProps) {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const btnRef = useRef<UiImageButtonHandle | null>(null);

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
    
    // Update music manager preference
    MusicManager.getInstance().setMusicEnabled(newState);

    // Determine if we are currently in-game (only when on the game route)
    let handledInGame = false;
    try {
      const w: any = typeof window !== 'undefined' ? window : {};
      const game: any = w.__CATCH_GAME_INSTANCE__;
      const scene: any = game?.scene?.keys?.Game;
      const path = typeof window !== 'undefined' ? window.location?.pathname || '' : '';
      const isOnGameRoute = path.includes('/views/game');
      // Treat these as menu routes explicitly
      const isMenuRoute = !isOnGameRoute && (
        path === '/' ||
        path.startsWith('/views/how-to-play') ||
        path.startsWith('/views/leaderboard') ||
        path.startsWith('/views/score') ||
        path.startsWith('/views/abilities')
      );

      if (isOnGameRoute && scene) {
        handledInGame = true;
        const bgMusic: any = scene?.bgMusic;
        if (!newState) {
          // Pause game music if present; also pause menu music to avoid overlap
          try { MusicManager.getInstance().pause(); } catch {}
          if (bgMusic && typeof bgMusic.pause === 'function') {
            bgMusic.pause();
          }
        } else {
          // Enabling in-game: resume/create ONLY the game music, do not resume menu music
          const soundEnabled = localStorage.getItem('soundEnabled');
          const musicEnabled = localStorage.getItem('musicEnabled');
          if (soundEnabled !== 'false' && musicEnabled !== 'false') {
            if (bgMusic && typeof bgMusic.resume === 'function') {
              bgMusic.resume();
            } else if (scene?.sound?.add) {
              try {
                scene.bgMusic = scene.sound.add('music', { loop: true, volume: 0.5 });
                scene.bgMusic.play();
              } catch {}
            }
          }
        }
      } else if (isMenuRoute) {
        // Force menu behavior on menu routes; also make sure any lingering bgMusic is paused
        const bgMusic: any = scene?.bgMusic;
        if (!newState) {
          try { MusicManager.getInstance().pause(); } catch {}
          if (bgMusic && typeof bgMusic.pause === 'function') {
            try { bgMusic.pause(); } catch {}
          }
        } else {
          try { MusicManager.getInstance().resume(); } catch {}
          if (bgMusic && typeof bgMusic.pause === 'function') {
            try { bgMusic.pause(); } catch {}
          }
        }
        handledInGame = false; // ensure fall-through does not run
      }
    } catch {}

    // If not in-game, control only the menu music via MusicManager
    if (!handledInGame) {
      try {
        if (!newState) {
          MusicManager.getInstance().pause();
        } else {
          MusicManager.getInstance().resume();
        }
      } catch {}
    }

    // Notify parent/page for context-specific handling (e.g., game music)
    try { onToggled?.(newState); } catch {}
  };

  // Allow Start button on the gamepad to toggle sound globally
  useEffect(() => {
    const unsubscribe = GamepadManager.getInstance().addListener((btn) => {
      if (btn === ('Start' as any)) {
        try { btnRef.current?.triggerPress(150); } catch {}
        setTimeout(() => { try { handleToggleSound(); } catch {} }, 120);
      }
    });
    return unsubscribe;
  }, [isSoundEnabled]);

  return (
    <UiImageButton
      ref={btnRef}
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
