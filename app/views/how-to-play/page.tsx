'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function HowToPlayPage() {
  const router = useRouter();

  const scale = 1.2;
  const s = (n: number) => Math.round(n * scale);
  const iconCol = s(120);

  return (
    <main style={{ minHeight: '100vh', height: '100vh', background: `#040218 url(/assets/ui/background-menu.gif) center/cover no-repeat fixed`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '20px', position: 'relative' }}>
      {/* Home button top-left (same as leaderboard) */}
      <button
        onClick={() => router.push('/')}
        aria-label="Retour à l'accueil"
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
          zIndex: 5,
          transition: 'transform 0.12s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/home-button-up.png')"; }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/home-button-down.png')"; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/home-button-up.png')"; }}
        onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/home-button-down.png')"; }}
        onTouchEnd={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundImage = "url('/assets/ui/buttons/home-button-up.png')"; }}
      />
      {/* Title banner */}
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
          <div style={{ fontSize: '32px', color: '#ED1C24', fontFamily: 'November, sans-serif', fontWeight: 700, textAlign: 'center' }}>Comment jouer</div>
        </div>
      </div>

      {/* Cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(260px, 1fr))',
        gap: '20px',
        width: '100%',
        maxWidth: '1200px',
        marginTop: '20px'
      }}>
        {/* Card: Controles (same width as other cards) */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '15px',
          padding: '10px 12px',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          gridColumn: '1 / -1',
          justifySelf: 'center',
          maxWidth: '520px',
          width: '100%'
        }}>
          <h3 style={{ margin: 0, marginBottom: '6px', color: '#e7e9ff', fontSize: '20px', fontFamily: 'November, sans-serif', textAlign: 'center' }}>Controles</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: 8 }}>
            {/* Left keys with movement label and space below */}
            <div style={{ display: 'grid', gridTemplateRows: 'auto auto auto', justifyItems: 'center', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <img src={'/assets/Q.png'} alt="Q" width={s(36)} height={s(36)} style={{ objectFit: 'contain' }} />
                <img src={'/assets/D.png'} alt="D" width={s(36)} height={s(36)} style={{ objectFit: 'contain' }} />
              </div>
              <div style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(16) }}>Se déplacer (Q et D)</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <img src={'/assets/space.png'} alt="Space" width={s(90)} height={s(36)} style={{ objectFit: 'contain' }} />
                <span style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(16) }}>Dash</span>
              </div>
            </div>
            {/* Right mouse with 2-line caption below, no physical divider between sections */}
            <div style={{ display: 'grid', gridTemplateRows: 'auto auto', alignItems: 'center', justifyItems: 'center', gap: 4 }}>
              <img src={'/assets/leftClick.png'} alt="Click gauche" width={s(40)} height={s(40)} style={{ objectFit: 'contain' }} />
              <div style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(16), lineHeight: 1.15, textAlign: 'center' }}>
                Lancer une<br />
                boule de neige
              </div>
            </div>
          </div>
        </div>

        {/* Card: Objectifs (smaller) */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '15px',
          padding: '14px',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#e7e9ff', fontSize: '20px', fontFamily: 'November, sans-serif', textAlign: 'center' }}>Objectifs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: `${iconCol}px 1fr`, alignItems: 'center', gap: 10 }}>
              <img src={'/assets/items/snowflakes/snow0.png'} alt="snowflake" width={s(64)} height={s(64)} style={{ objectFit: 'contain', justifySelf: 'center' }} />
              <span style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(18) }}>Recupere des flocons pour ameliorer tes capacites</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `${iconCol}px 1fr`, alignItems: 'center', gap: 10 }}>
              <div style={{ width: s(56), height: s(56), borderRadius: s(56), background: 'radial-gradient(#ffffff, #d1d5db)', boxShadow: '0 2px 10px rgba(255,255,255,0.35), inset 0 -4px 8px rgba(0,0,0,0.15)', justifySelf: 'center' }} />
              <span style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(18) }}>Enneige les ennemis et evite les pieges</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `${iconCol}px 1fr`, alignItems: 'center', gap: 10 }}>
              <img src={'/assets/upgrade.png'} alt="upgrade" width={s(64)} height={s(64)} style={{ objectFit: 'contain', transform: 'rotate(-90deg)', justifySelf: 'center' }} />
              <span style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(18) }}>Ameliore tes attributs entre les parties</span>
            </div>
          </div>
        </div>

        {/* Card: Objets (placed next to Objectifs) */
        }
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '15px',
          padding: '14px',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#e7e9ff', fontSize: '20px', fontFamily: 'November, sans-serif', textAlign: 'center' }}>Objets</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {/* Each cell is a 2-col grid: fixed icon col and flexible label col */}
            <div style={{ display: 'grid', gridTemplateColumns: `${s(56)}px 1fr`, alignItems: 'center', gap: 10 }}>
              <img src={'/assets/gift1.png'} alt="gift1" width={s(48)} height={s(48)} style={{ objectFit: 'contain', justifySelf: 'center' }} />
              <span style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(18) }}>Double points</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `${s(56)}px 1fr`, alignItems: 'center', gap: 10 }}>
              <img src={'/assets/items/freeze-bottle.png'} alt="freeze-bottle" width={s(48)} height={s(48)} style={{ objectFit: 'contain', justifySelf: 'center' }} />
              <span style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(18) }}>Immobilise</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `${s(56)}px 1fr`, alignItems: 'center', gap: 10 }}>
              <img src={'/assets/gift3.png'} alt="gift3" width={s(48)} height={s(48)} style={{ objectFit: 'contain', justifySelf: 'center' }} />
              <span style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(18) }}>Super boules de neige</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `${s(56)}px 1fr`, alignItems: 'center', gap: 10 }}>
              <img src={'/assets/items/vodka.png'} alt="vodka" width={s(48)} height={s(48)} style={{ objectFit: 'contain', justifySelf: 'center' }} />
              <span style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(18) }}>Bonus de deplacement</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `${s(56)}px 1fr`, alignItems: 'center', gap: 10 }}>
              <img src={'/assets/gift2.png'} alt="gift2" width={s(48)} height={s(48)} style={{ objectFit: 'contain', justifySelf: 'center' }} />
              <span style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(18) }}>+500 points</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


