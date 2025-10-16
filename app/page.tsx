'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function Home() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const sprintRef = useRef<() => void>(() => {});

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
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div
          style={{
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

        <div style={{
              margin: '0 0 0 20px',
            }}>
        <button
          onClick={() => { sprintRef.current?.(); setTimeout(() => router.push('/views/name'), 650); }}
          style={{
            width: '600px',
            height: '160px',
            backgroundImage: "url('/assets/ui/buttons/button-red-up.png')",
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundColor: 'transparent',
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: 'bold',
            fontFamily: 'November, sans-serif',
            textTransform: 'uppercase',
            border: 'none',
            cursor: 'pointer',
            transition: 'transform 0.12s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-red-up.png')";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.98)';
            sprintRef.current?.();
            (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-red-down.png')";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-red-up.png')";
          }}
        >
          <span style={{ position: 'relative', top: '-8px' }}>Commencer le jeu</span>
        </button>

        {/* Secondary white button below the red one */}
        <button
          onClick={() => router.push('/views/leaderboard')}
          style={{
            width: '400px',
            height: '115px',
            marginTop: '24px',
            marginLeft: '100px',
            backgroundImage: "url('/assets/ui/buttons/button-blank-up.png')",
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundColor: 'transparent',
            color: '#1b0f10',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            fontFamily: 'November, sans-serif',
            border: 'none',
            cursor: 'pointer',
            transition: 'transform 0.12s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textTransform: 'uppercase',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-blank-up.png')";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.98)';
            (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-blank-down.png')";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-blank-up.png')";
          }}
        >
          <span style={{ position: 'relative', top: '-6px', color: '#222' }}>score</span>
        </button>

        {/* Third green button below the white one */}
        <button
          style={{
            width: '580px',
            height: '180px',
            marginTop: '24px',
            backgroundImage: "url('/assets/ui/buttons/button-green-up.png')",
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundColor: 'transparent',
            color: '#1b0f10',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            fontFamily: 'November, sans-serif',
            border: 'none',
            cursor: 'pointer',
            transition: 'transform 0.12s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textTransform: 'uppercase',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-green-up.png')";
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.98)';
            (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-green-down.png')";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/button-green-up.png')";
          }}
        >
          <span style={{ position: 'relative', top: '-6px', color: '#222' }}>test</span>
        </button>
        </div>
        

      </div>
    </main>
  );
}
