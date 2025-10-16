'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import MusicManager from './utils/musicManager';
import SoundManager from './utils/soundManager';

export default function Home() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const sprintRef = useRef<() => void>(() => {});
  const [showNameOverlay, setShowNameOverlay] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [matchedExistingName, setMatchedExistingName] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const playButtonRef = useRef<HTMLButtonElement | null>(null);
  const playImageRef = useRef<HTMLImageElement | null>(null);

  const animatePlayButton = () => {
    const btn = playButtonRef.current as HTMLButtonElement | null;
    const img = playImageRef.current as HTMLImageElement | null;
    try {
      if (btn) btn.style.transform = 'scale(0.98)';
      if (img) img.src = '/assets/ui/buttons/play-button-down.png';
      setTimeout(() => {
        if (btn) btn.style.transform = 'scale(1.05)';
        if (img) img.src = '/assets/ui/buttons/play-button-up.png';
      }, 150);
    } catch {}
  };

  const submitName = async () => {
    const entered = (pseudo || '').trim();
    if (!entered) return;
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

  // Menu music effect
  useEffect(() => {
    const musicManager = MusicManager.getInstance();
    
    // Only start music if it's not already playing
    if (!musicManager.isCurrentlyPlaying()) {
      musicManager.playMenuMusic();
    }

    return () => {
      // Only stop music if we're going to game, not to other menu pages
      const currentPath = window.location.pathname;
      if (currentPath.includes('/views/game')) {
        musicManager.stop();
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

    // Load player sprite
    const playerSprite = new Image();
    playerSprite.src = '/assets/characters/santa-walk.png';
    
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

      constructor() {
        this.x = -50; // Start off-screen left
        this.y = (canvas?.height || window.innerHeight) - 80; // Floor level
        this.frame = 0;
        this.frameSpeed = 0.2;
        this.frameCount = 0;
        this.speed = 3;
        this.startTime = Date.now();
        this.sprintEndAt = null;
      }

      update() {
        const currentTime = Date.now();
        const elapsed = currentTime - this.startTime;

        // Sprint logic
        if (this.sprintEndAt && currentTime < this.sprintEndAt) {
          this.speed = 6;
          this.frameSpeed = 0.35;
        } else {
          this.speed = 3;
          this.frameSpeed = 0.2;
          this.sprintEndAt = null;
        }

        // Update animation frame
        this.frameCount += this.frameSpeed;
        this.frame = Math.floor(this.frameCount) % 6; // 6 frames in the sprite
        
        // Move right across screen with trajectory
        this.x += this.speed;
        
        // Calculate trajectory Y position - stay on floor level
        const screenWidth = canvas?.width || window.innerWidth;
        const screenHeight = canvas?.height || window.innerHeight;
        
        // Keep character on floor level (bottom of screen)
        const floorY = screenHeight - 80; // Floor level
        this.y = floorY;
        
        // Reset when off screen
        if (this.x > screenWidth + 50) {
          this.x = -50;
          this.y = floorY; // start at floor level
        }
      }

      draw() {
        if (!ctx || !playerSprite.complete) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(3, 3); // scale up 3x

        // Draw player frame from sprite
        const frameWidth = 32; // frame width in pixels
        const frameHeight = 32; // frame height in pixels
        const sourceX = this.frame * frameWidth;
        const sourceY = 0; // Only one row in the sprite
        
        ctx.drawImage(
          playerSprite,
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

    // Start animation when sprite is loaded
    playerSprite.onload = () => {
      animate();
    };

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
        <div
          style={{
            position: 'fixed',
            top: '40px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '640px',
            height: '160px',
            backgroundImage: "url('/assets/ui/main-menu/title-background.png')",
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          <h1
            style={{
              fontSize: '3rem',
              color: '#ED1C24',
              margin: '0 0 25px 0',
              textAlign: 'center',
              textShadow: '0 0 20px rgba(231, 233, 255, 0.3)'
            }}
          >
            Drunk Santa
          </h1>
        </div>

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
          <button
            onClick={() => { 
              SoundManager.getInstance().playClickSound();
              sprintRef.current?.(); 
              setTimeout(() => setShowNameOverlay(true), 150);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              transition: 'transform 0.12s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { 
              e.currentTarget.style.transform = 'scale(1)'; 
              const label = e.currentTarget.querySelector('span') as HTMLSpanElement | null;
              if (label) label.style.transform = 'translateY(-6px)';
            }}
            onMouseDown={(e) => { 
              e.currentTarget.style.transform = 'scale(0.98)'; 
              sprintRef.current?.();
              const label = e.currentTarget.querySelector('span') as HTMLSpanElement | null;
              if (label) label.style.transform = 'translate(-12px, 6px)';
            }}
            onMouseUp={(e) => { 
              e.currentTarget.style.transform = 'scale(1.05)'; 
              const label = e.currentTarget.querySelector('span') as HTMLSpanElement | null;
              if (label) label.style.transform = 'translateY(-6px)';
            }}
          >
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src="/assets/ui/buttons/button-red-up.png"
                alt="Commencer"
                style={{ height: '160px', width: 'auto', display: 'block' }}
                onMouseDown={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-red-down.png'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-red-up.png'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-red-up.png'; }}
              />
              <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', color: '#ffffff', fontSize: '1.3rem', fontWeight: 'bold', fontFamily: 'November, sans-serif', textTransform: 'uppercase', transform: 'translateY(-6px)' }}>Commencer</span>
            </div>
          </button>
        ) : (
          <button
            onClick={() => { 
              SoundManager.getInstance().playClickSound();
              sprintRef.current?.(); 
              setTimeout(() => submitName(), 150);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              transition: 'transform 0.12s ease',
              marginLeft: '-20px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; sprintRef.current?.(); }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            ref={playButtonRef}
          >
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src="/assets/ui/buttons/play-button-up.png"
                alt="Jouer"
                style={{ height: '130px', width: 'auto', display: 'block' }}
                onMouseDown={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/play-button-down.png'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/play-button-up.png'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/play-button-up.png'; }}
                ref={playImageRef}
              />
            </div>
          </button>
        )}

        {!showNameOverlay && (
          <>
            {/* Secondary button below the red one (Comment jouer) */}
            <button
              onClick={() => {
                SoundManager.getInstance().playClickSound();
                router.push('/views/how-to-play');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'transform 0.12s ease',
                
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.transform = 'scale(1)'; 
                const label = e.currentTarget.querySelector('span') as HTMLSpanElement | null;
                if (label) label.style.transform = 'translateY(-6px)';
              }}
              onMouseDown={(e) => { 
                e.currentTarget.style.transform = 'scale(0.98)'; 
                const label = e.currentTarget.querySelector('span') as HTMLSpanElement | null;
                if (label) label.style.transform = 'translate(-12px, 6px)';
              }}
              onMouseUp={(e) => { 
                e.currentTarget.style.transform = 'scale(1.05)'; 
                const label = e.currentTarget.querySelector('span') as HTMLSpanElement | null;
                if (label) label.style.transform = 'translateY(-6px)';
              }}
            >
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src="/assets/ui/buttons/button-brown-up.png"
                  alt="Comment jouer"
                  style={{ height: '160px', width: 'auto', display: 'block' }}
                  onMouseDown={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-brown-down.png'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-brown-up.png'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-brown-up.png'; }}
                />
                <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', color: '#ffffff', fontSize: '1.1rem', fontWeight: 'bold', fontFamily: 'November, sans-serif', textTransform: 'uppercase', transform: 'translateY(-6px)' }}>Comment jouer</span>
              </div>
            </button>

            {/* Third green button below the white one */}
            <button
              onClick={() => {
                SoundManager.getInstance().playClickSound();
                router.push('/views/leaderboard');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'transform 0.12s ease',
                
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.transform = 'scale(1)'; 
                const label = e.currentTarget.querySelector('span') as HTMLSpanElement | null;
                if (label) label.style.transform = 'translateY(-6px)';
              }}
              onMouseDown={(e) => { 
                e.currentTarget.style.transform = 'scale(0.98)'; 
                const label = e.currentTarget.querySelector('span') as HTMLSpanElement | null;
                if (label) label.style.transform = 'translate(-12px, 6px)';
              }}
              onMouseUp={(e) => { 
                e.currentTarget.style.transform = 'scale(1.05)'; 
                const label = e.currentTarget.querySelector('span') as HTMLSpanElement | null;
                if (label) label.style.transform = 'translateY(-6px)';
              }}
            >
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src="/assets/ui/buttons/button-green-up.png"
                  alt="Classement"
                  style={{ height: '110px', width: 'auto', display: 'block' }}
                  onMouseDown={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-green-down.png'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-green-up.png'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-green-up.png'; }}
                />
                <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', color: '#ffffff', fontSize: '1.1rem', fontWeight: 'bold', fontFamily: 'November, sans-serif', textTransform: 'uppercase', transform: 'translateY(-6px)' }}>classement</span>
              </div>
            </button>
          </>
        )}
        </div>
        

      </div>

      {showNameOverlay && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 3, paddingTop: '80px', pointerEvents: 'none' }}>
          {/* Back button like leaderboard */}
          <button
            onClick={() => {
              SoundManager.getInstance().playClickSound();
              setShowNameOverlay(false);
            }}
            aria-label="Retour"
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              width: '140px',
              height: '70px',
              backgroundImage: "url('/assets/ui/buttons/home-button-up.png')",
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              zIndex: 4,
              transition: 'transform 0.12s ease',
              pointerEvents: 'auto',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/home-button-up.png')"; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/home-button-down.png')"; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/home-button-up.png')"; }}
          />
          <div style={{ position: 'relative', width: '280px', maxWidth: '70vw', aspectRatio: '5 / 2', pointerEvents: 'auto' }}>
            <img src="/assets/ui/main-menu/input.png" alt="Input" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }} />
            <form
              onSubmit={(e) => { e.preventDefault(); sprintRef.current?.(); animatePlayButton(); setTimeout(() => submitName(), 150); }}
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
          <div style={{ position: 'relative', width: '540px', maxWidth: '92vw' }}>
            <img src="/assets/ui/scoreboard/scoreboard-title-background.png" alt="support" style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: '0 8%' }}>
              <div style={{ textAlign: 'center', fontFamily: 'November, sans-serif', fontWeight: 700, fontSize: 'clamp(14px, 2.2vw, 20px)', textShadow: '0 2px 0 rgba(0,0,0,0.25)', lineHeight: 1.8, color: '#b20c0f', marginBottom: '80px' }}>
                Le pseudo "{(pseudo || '').trim()}" correspond deja a un joueur existant ({matchedExistingName}). Voulez-vous jouer en utilisant cette session existante ?
              </div>
            </div>
            {/* Buttons row under the image */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px' }}>
              {/* Red continue */}
              <button
                onClick={() => {
                  SoundManager.getInstance().playClickSound();
                  confirmUseExisting();
                }}
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', transition: 'transform 0.12s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              >
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src="/assets/ui/buttons/button-red-up.png"
                    alt="Continuer"
                    style={{ height: '80px', width: 'auto', display: 'block' }}
                    onMouseDown={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-red-down.png'; }}
                    onMouseUp={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-red-up.png'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-red-up.png'; }}
                  />
                  <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', color: '#1b0f10', fontSize: '1rem', fontWeight: 'bold', fontFamily: 'November, sans-serif', textTransform: 'uppercase', transform: 'translateY(-4px)' }}>Continuer</span>
                </div>
              </button>

              {/* Green modify */}
              <button
                onClick={() => {
                  SoundManager.getInstance().playClickSound();
                  setShowWarning(false);
                }}
                style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', transition: 'transform 0.12s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              >
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src="/assets/ui/buttons/button-green-up.png"
                    alt="Modifier"
                    style={{ height: '80px', width: 'auto', display: 'block' }}
                    onMouseDown={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-green-down.png'; }}
                    onMouseUp={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-green-up.png'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-green-up.png'; }}
                  />
                  <span style={{ position: 'absolute', right: '-5px', top: '25px', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', color: '#1b0f10', fontSize: '1rem', fontWeight: 'bold', fontFamily: 'November, sans-serif', textTransform: 'uppercase' }}>Modifier</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
