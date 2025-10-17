'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import TitleBanner from '@/app/components/TitleBanner';
import HomeButton from '@/app/components/HomeButton';
import UiImageButton, { UiImageButtonHandle } from '@/app/components/UiImageButton';
import ImageModal from '@/app/components/ImageModal';
import { renderAlternating } from '@/app/utils/renderAlternating';
import MusicManager from '@/app/utils/musicManager';
import MusicConsentModal from '@/app/components/MusicConsentModal';
import SoundToggleButton from '@/app/components/SoundToggleButton';
import SoundManager from '@/app/utils/soundManager';

export default function Home() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const sprintRef = useRef<() => void>(() => {});
  const [showMusicConsent, setShowMusicConsent] = useState(false);
  const [showNameOverlay, setShowNameOverlay] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [matchedExistingName, setMatchedExistingName] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const playUiRef = useRef<UiImageButtonHandle | null>(null);

  const animatePlayButton = () => {
    // Play button click sound
    SoundManager.getInstance().playButtonClick();
    playUiRef.current?.triggerPress(150);
  };

  const submitName = async () => {
    const entered = (pseudo || '').trim();
    if (!entered) return;
    
    // Start music on user interaction
    MusicManager.getInstance().startMusicOnInteraction();
    
    try {
      const res = await fetch('/api/players', { cache: 'no-store' });
      if (!res.ok) throw new Error('players endpoint returned non-OK');
      const names: string[] = await res.json();
      const lower = entered.toLowerCase();
      const match = names.find((n) => n.toLowerCase() === lower) || null;
      if (match) {
        setMatchedExistingName(match);
        setShowWarning(true);
        return;
      }
    } catch (err: any) {
      setApiError('Vérification du pseudo indisponible.');
      try {
        await fetch('/api/log', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            level: 'warn',
            message: 'DB not reachable: name verification failed from client.',
            detail: String(err?.message || err || 'unknown')
          })
        });
      } catch {}
      return; // Do not proceed to game when verification failed
    }
    localStorage.setItem('playerPseudo', entered);
    // Stop menu music before going to game
    MusicManager.getInstance().stop();
    router.push('/views/game');
  };

  const confirmUseExisting = () => {
    const nameToUse = matchedExistingName || pseudo.trim();
    if (!nameToUse) return;
    localStorage.setItem('playerPseudo', nameToUse);
    setShowWarning(false);
    // Stop menu music before going to game
    MusicManager.getInstance().stop();
    router.push('/views/game');
  };

  const handleMusicConsentClose = () => {
    setShowMusicConsent(false);
    // Marquer que l'utilisateur a vu la popup
    localStorage.setItem('hasSeenMusicConsent', 'true');
  };

  // Menu music effect
  useEffect(() => {
    // Vérifier si c'est la première visite
    const hasSeenMusicConsent = localStorage.getItem('hasSeenMusicConsent');
    
    if (!hasSeenMusicConsent) {
      // Première visite : afficher la popup de consentement
      setShowMusicConsent(true);
    } else {
      // Visite suivante : reprendre la musique si elle était activée
      const musicManager = MusicManager.getInstance();
      musicManager.resumeMusicIfEnabled();
    }

    return () => {
      // Only stop music if we're going to game, not to other menu pages
      const currentPath = window.location.pathname;
      if (currentPath.includes('/views/game')) {
        MusicManager.getInstance().stop();
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    let player: Player | null = null;
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (player) {
        player.y = (canvas?.height || window.innerHeight) - 80; // keep on floor level
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Load player sprites
    const playerSprite = new Image();
    playerSprite.src = '/assets/characters/santa-walk.png';
    
    const jumpSprite = new Image();
    jumpSprite.src = '/assets/characters/santa-jump.png';
    
    // Player class
    class Player {
      x: number;
      y: number;
      frame: number;
      frameSpeed: number;
      frameCount: number;
      speed: number;
      startTime: number;
      sprintEndAt: number | null;
      isJumping: boolean;
      jumpStartTime: number | null;
      jumpDuration: number;
      originalY: number;
      jumpHeight: number;
      dogX: number;
      fireplaceX: number;

      constructor() {
        this.x = -50; // Start off-screen left
        this.y = (canvas?.height || window.innerHeight) - 80; // Floor level
        this.originalY = this.y;
        this.frame = 0;
        this.frameSpeed = 0.2;
        this.frameCount = 0;
        this.speed = 3;
        this.startTime = Date.now();
        this.sprintEndAt = null;
        this.isJumping = false;
        this.jumpStartTime = null;
        this.jumpDuration = 800; // Jump duration in ms
        this.jumpHeight = 60; // How high he jumps
        this.dogX = 0; // Will be set when canvas resizes
        this.fireplaceX = 0; // Will be set when canvas resizes
      }

      update() {
        const currentTime = Date.now();
        const elapsed = currentTime - this.startTime;
        const screenWidth = canvas?.width || window.innerWidth;
        const screenHeight = canvas?.height || window.innerHeight;
        const floorY = screenHeight - 80;

        // Update dog and fireplace positions (adjust these based on your GIF background)
        this.dogX = screenWidth * 0.75; // Adjust this to match where the dog is in your GIF
        this.fireplaceX = screenWidth * 0.7; // Adjust this to match where the fireplace is in your GIF

        // Check if Santa should jump (when he gets close to the dog)
        if (!this.isJumping && this.x >= this.dogX - 100 && this.x <= this.dogX + 50) {
          this.startJump();
        }

        // Handle jumping animation
        if (this.isJumping && this.jumpStartTime) {
          const jumpProgress = (currentTime - this.jumpStartTime) / this.jumpDuration;
          
          if (jumpProgress >= 1) {
            // Jump finished
            this.isJumping = false;
            this.jumpStartTime = null;
            this.y = this.originalY;
            this.frame = 0; // Reset to walking frame
          } else {
            // Calculate jump trajectory (parabolic)
            const jumpPhase = jumpProgress * Math.PI; // 0 to π
            const jumpOffset = Math.sin(jumpPhase) * this.jumpHeight;
            this.y = this.originalY - jumpOffset;
            
            // Update frame based on jump progress (using santa-jump.png frames)
            if (jumpProgress < 0.3) {
              this.frame = 6; // Jump start frame (frame 6 in santa-jump.png)
            } else if (jumpProgress < 0.7) {
              this.frame = 7; // High jump frame (frame 7 in santa-jump.png)
            } else {
              this.frame = 6; // Landing frame (frame 6 in santa-jump.png)
            }
          }
        } else {
          // Normal walking animation
          // Sprint logic
          if (this.sprintEndAt && currentTime < this.sprintEndAt) {
            this.speed = 6;
            this.frameSpeed = 0.35;
          } else {
            this.speed = 3;
            this.frameSpeed = 0.2;
            this.sprintEndAt = null;
          }

          // Update animation frame (only for walking frames 0-5)
          this.frameCount += this.frameSpeed;
          this.frame = Math.floor(this.frameCount) % 6; // 6 walking frames
        }
        
        // Move right across screen
        this.x += this.speed;
        
        // Keep character on floor level when not jumping
        if (!this.isJumping) {
          this.y = floorY;
        }
        
        // Reset when off screen
        if (this.x > screenWidth + 50) {
          this.x = -50;
          this.y = floorY;
          this.isJumping = false;
          this.jumpStartTime = null;
        }
      }

      startJump() {
        this.isJumping = true;
        this.jumpStartTime = Date.now();
        // Play jump sound if you want
        // SoundManager.getInstance().playJumpSound();
      }

      draw() {
        // Choose the correct sprite based on state
        const currentSprite = this.isJumping ? jumpSprite : playerSprite;
        if (!ctx || !currentSprite.complete) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(3, 3); // scale up 3x

        // Draw player frame from sprite
        const frameWidth = 32; // frame width in pixels
        const frameHeight = 32; // frame height in pixels
        const sourceX = this.frame * frameWidth;
        const sourceY = 0; // Only one row in the sprite
        
        ctx.drawImage(
          currentSprite,
          sourceX, sourceY, frameWidth, frameHeight,
          -frameWidth/2, -frameHeight/2, frameWidth, frameHeight
        );

        ctx.restore();
      }

      startSprint(durationMs: number) {
        this.sprintEndAt = Date.now() + durationMs;
      }
    }

    // Create player
    player = new Player();
    // expose sprint trigger to component
    sprintRef.current = () => player?.startSprint(700);

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      player.update();
      player.draw();

      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation when both sprites are loaded
    let spritesLoaded = 0;
    const onSpriteLoad = () => {
      spritesLoaded++;
      if (spritesLoaded === 2) {
        animate();
      }
    };
    
    playerSprite.onload = onSpriteLoad;
    jumpSprite.onload = onSpriteLoad;

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      sprintRef.current = () => {};
    };
  }, []);

  return (
    <main style={{ 
      minHeight: '100vh', 
      height: '100vh', 
      backgroundImage: "url('/assets/ui/background-menu.gif')",
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated player canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      />
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, paddingTop: '200px' }}>
        <TitleBanner text="Drunk Santa" backgroundSrc="/assets/ui/main-menu/title-background.png" />

        {/* Spacer shown when the input overlay is open to avoid overlap */}
        {showNameOverlay && (
          <div style={{ height: '140px' }} />
        )}

        <div style={{
              margin: '0 0 0 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
            }}>
        {!showNameOverlay ? (
          <UiImageButton
            imageUpSrc="/assets/ui/buttons/button-red-up.png"
            imageDownSrc="/assets/ui/buttons/button-red-down.png"
            label="Commencer"
            heightPx={160}
            onClick={() => { 
              setTimeout(() => setShowNameOverlay(true), 150);
            }}
            ariaLabel="Commencer"
          />
        ) : (
          <UiImageButton
            imageUpSrc="/assets/ui/buttons/play-button-up.png"
            imageDownSrc="/assets/ui/buttons/play-button-down.png"
            heightPx={130}
            onClick={() => { 
              setTimeout(() => submitName(), 150);
            }}
            ariaLabel="Jouer"
            style={{ paddingTop: '150px', marginLeft: '-15px' }}
            ref={playUiRef}
          />
        )}

        {!showNameOverlay && (
          <>
            {/* Secondary button below the red one (Comment jouer) */}
            <UiImageButton
              imageUpSrc="/assets/ui/buttons/button-brown-up.png"
              imageDownSrc="/assets/ui/buttons/button-brown-down.png"
              label="Comment jouer"
              heightPx={160}
              onClick={() => router.push('/views/how-to-play')}
              ariaLabel="Comment jouer"
            />

            {/* Third green button below the white one */}
            <UiImageButton
              imageUpSrc="/assets/ui/buttons/button-green-up.png"
              imageDownSrc="/assets/ui/buttons/button-green-down.png"
              label="classement"
              heightPx={110}
              onClick={() => router.push('/views/leaderboard')}
              ariaLabel="Classement"
            />
          </>
        )}
        </div>
        

      </div>

        {showNameOverlay && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 3, paddingTop: '80px', pointerEvents: 'none' }}>
          <HomeButton onClick={() => setShowNameOverlay(false)} delayMs={150} />
          <div style={{ position: 'relative', width: '280px', maxWidth: '70vw', aspectRatio: '5 / 2', pointerEvents: 'auto' }}>
            <img src="/assets/ui/main-menu/input.png" alt="Input" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }} />
            <form
              onSubmit={(e) => { e.preventDefault(); animatePlayButton(); setTimeout(() => submitName(), 150); }}
              style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '10% 16%' }}
            >
              <input
                type="text"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value.slice(0, 13))}
                placeholder="Votre pseudo"
                maxLength={13}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  fontSize: '1.3rem',
                  fontFamily: 'November, sans-serif',
                  color: '#ffffff',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  textAlign: 'center',
                }}
              />
              <style jsx>{`
                input::placeholder { color: #ffffff; opacity: 0.85; }
              `}</style>
              {/* No on-screen buttons: Enter submits. Start button also calls submitName when overlay is open. */}
            </form>
          </div>
        </div>
      )}

      {showWarning && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4, padding: '16px' }}>
          <ImageModal
            backgroundSrc="/assets/ui/scoreboard/scoreboard-title-background.png"
            offsetTopPercent={32}
            content={
              <div style={{ textAlign: 'center', fontFamily: 'November, sans-serif', fontWeight: 700, fontSize: 'clamp(14px, 2.2vw, 20px)', textShadow: '0 2px 0 rgba(0,0,0,0.25)', lineHeight: 1.8 }}>
                <span style={{ color: '#b20c0f' }}>Le pseudo "</span>
                <span>{renderAlternating(`${(pseudo || '').trim()}`, true)}</span>
                <span style={{ color: '#b20c0f' }}>" correspond deja a un joueur existant (</span>
                <span>{renderAlternating(`${matchedExistingName || ''}`, false)}</span>
                <span style={{ color: '#b20c0f' }}>)
                . Voulez-vous jouer en utilisant cette session existante ?</span>
              </div>
            }
            buttons={[
              {
                imageUpSrc: '/assets/ui/buttons/button-red-up.png',
                imageDownSrc: '/assets/ui/buttons/button-red-down.png',
                label: 'Continuer',
                heightPx: 160,
                onClick: confirmUseExisting,
                ariaLabel: 'Continuer',
              },
              {
                imageUpSrc: '/assets/ui/buttons/button-green-up.png',
                imageDownSrc: '/assets/ui/buttons/button-green-down.png',
                label: 'Modifier',
                heightPx: 110,
                onClick: () => setShowWarning(false),
                ariaLabel: 'Modifier',
              },
            ]}
          />
        </div>
      )}

      {/* Music Consent Modal */}
        {showMusicConsent && (
          <MusicConsentModal onClose={handleMusicConsentClose} />
        )}

        {/* Sound toggle button */}
        <SoundToggleButton />
      </main>
    );
  }
