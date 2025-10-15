'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const sprintRef = useRef<() => void>(() => {});
  const [showNameOverlay, setShowNameOverlay] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [matchedExistingName, setMatchedExistingName] = useState<string | null>(null);

  const submitName = async () => {
    const entered = (pseudo || '').trim();
    if (!entered) return;
    try {
      const res = await fetch('/api/players', { cache: 'no-store' });
      if (res.ok) {
        const names: string[] = await res.json();
        const lower = entered.toLowerCase();
        const match = names.find((n) => n.toLowerCase() === lower) || null;
        if (match) {
          setMatchedExistingName(match);
          setShowWarning(true);
          return;
        }
      }
    } catch {}
    localStorage.setItem('playerPseudo', entered);
    router.push('/views/game');
  };

  const confirmUseExisting = () => {
    const nameToUse = matchedExistingName || pseudo.trim();
    if (!nameToUse) return;
    localStorage.setItem('playerPseudo', nameToUse);
    setShowWarning(false);
    router.push('/views/game');
  };

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
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; sprintRef.current?.(); }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
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
              <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', color: '#1b0f10', fontSize: '1.3rem', fontWeight: 'bold', fontFamily: 'November, sans-serif', textTransform: 'uppercase', transform: 'translateY(-6px)' }}>Commencer</span>
            </div>
          </button>
        ) : (
          <button
            onClick={() => { 
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
          >
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src="/assets/ui/buttons/play-button-up.png"
                alt="Jouer"
                style={{ height: '130px', width: 'auto', display: 'block' }}
                onMouseDown={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/play-button-down.png'; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/play-button-up.png'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/play-button-up.png'; }}
              />
            </div>
          </button>
        )}

        {!showNameOverlay && (
          <>
            {/* Secondary white button below the red one */}
            <button
              onClick={() => router.push('/views/leaderboard')}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'transform 0.12s ease',
                
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            >
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src="/assets/ui/buttons/button-blank-up.png"
                  alt="Score"
                  style={{ height: '115px', width: 'auto', display: 'block' }}
                  onMouseDown={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-blank-down.png'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-blank-up.png'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-blank-up.png'; }}
                />
                <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', color: '#222', fontSize: '1.1rem', fontWeight: 'bold', fontFamily: 'November, sans-serif', textTransform: 'uppercase', transform: 'translateY(-6px)' }}>score</span>
              </div>
            </button>

            {/* Third green button below the white one */}
            <button
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'transform 0.12s ease',
                
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            >
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src="/assets/ui/buttons/button-green-up.png"
                  alt="Vert"
                  style={{ height: '180px', width: 'auto', display: 'block' }}
                  onMouseDown={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-green-down.png'; }}
                  onMouseUp={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-green-up.png'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLImageElement).src = '/assets/ui/buttons/button-green-up.png'; }}
                />
                <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', color: '#222', fontSize: '1.1rem', fontWeight: 'bold', fontFamily: 'November, sans-serif', textTransform: 'uppercase', transform: 'translateY(-6px)' }}>test</span>
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
            onClick={() => setShowNameOverlay(false)}
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
              onSubmit={(e) => { e.preventDefault(); submitName(); }}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4 }}>
          <div style={{ background: '#1a1a3a', border: '2px solid rgba(231, 233, 255, 0.2)', borderRadius: '16px', padding: '2rem', maxWidth: '480px', width: '92%', color: '#e7e9ff', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
            <h2 style={{ margin: 0, marginBottom: '0.75rem', fontSize: '1.6rem', fontWeight: 'bold', color: '#ffd166' }}>Attention</h2>
            <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.5 }}>
              Le pseudo "{(pseudo || '').trim()}" correspond déjà à un joueur existant ({matchedExistingName}). Voulez-vous jouer en utilisant cette session existante ?
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowWarning(false)} style={{ padding: '0.75rem 1.25rem', background: 'transparent', color: '#e7e9ff', border: '2px solid rgba(231, 233, 255, 0.4)', borderRadius: '10px', cursor: 'pointer' }}>Modifier le pseudo</button>
              <button onClick={confirmUseExisting} style={{ padding: '0.75rem 1.25rem', background: '#e7e9ff', color: '#040218', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Continuer avec ce compte</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
