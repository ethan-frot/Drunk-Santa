'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HomeButton from '@/app/components/HomeButton';
import TitleBanner from '@/app/components/TitleBanner';
import MusicManager from '@/app/utils/musicManager';
import SoundToggleButton from '@/app/components/SoundToggleButton';

export default function HowToPlayPage() {
  const router = useRouter();

  const scale = 1.2;
  const s = (n: number) => Math.round(n * scale);
  const iconCol = s(120);

  // Menu music effect
  useEffect(() => {
    const musicManager = MusicManager.getInstance();
    
    // Only start music if it's not already playing
    if (!musicManager.isCurrentlyPlaying()) {
      musicManager.playMenuMusic();
    }
  }, []);

  return (
    <main style={{ minHeight: '100vh', height: '100vh', background: `#040218 url(/assets/ui/background-menu.gif) center/cover no-repeat fixed`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '20px', position: 'relative' }}>
      <HomeButton />
      {/* Title banner */}
      <TitleBanner text="Comment jouer" backgroundSrc="/assets/ui/abilities/abilities-menu/title-background copy.png" fixedTop={true} topOffsetPx={40} fontSizeRem={2.4} />
      {/* Spacer to avoid content passing under the fixed banner */}
      <div style={{ height: '180px' }} />

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
                <img src={'/assets/ui/how-to-play/left-key.png'} alt="left-key" width={s(36)} height={s(36)} style={{ objectFit: 'contain' }} />
                <img src={'/assets/ui/how-to-play/right-key.png'} alt="right-key" width={s(36)} height={s(36)} style={{ objectFit: 'contain' }} />
              </div>
              <div style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(16) }}>Se déplacer (Q et D)</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <img src={'/assets/ui/how-to-play/dash-key.png'} alt="dash-key" width={s(60)} height={s(36)} style={{ objectFit: 'contain' }} />
                <span style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(16) }}>ou</span>
                <img src={'/assets/ui/buttons/gamepad/b-buttons.png'} alt="gamepad B" width={s(40)} height={s(40)} style={{ objectFit: 'contain' }} />
                <span style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(16) }}> pour Dash</span>
              </div>
            </div>
            {/* Right mouse with 2-line caption below, no physical divider between sections */}
            <div style={{ display: 'grid', gridTemplateRows: 'auto auto auto', alignItems: 'center', justifyItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <img src={'/assets/ui/how-to-play/left-click.png'} alt="left-click" width={s(40)} height={s(40)} style={{ objectFit: 'contain' }} />
                <span style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(16) }}>ou</span>
                <img src={'/assets/ui/buttons/gamepad/a-buttons.png'} alt="gamepad A" width={s(40)} height={s(40)} style={{ objectFit: 'contain' }} />
              </div>
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
          padding: '16px',
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
              <img src={'/assets/ui/how-to-play/snowball.png'} alt="snowball" width={s(64)} height={s(64)} style={{ objectFit: 'contain', justifySelf: 'center' }} />
              <span style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(18) }}>Enneige les ennemis</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `${iconCol}px 1fr`, alignItems: 'center', gap: 10 }}>
              <img src={'/assets/ui/how-to-play/upgrade.png'} alt="upgrade" width={s(64)} height={s(64)} style={{ objectFit: 'contain', justifySelf: 'center' }} />
              <span style={{ color: '#e7e9ff', fontFamily: 'November, sans-serif', fontSize: s(18) }}>Ameliore les attribus apres chaque partie</span>
            </div>
          </div>
        </div>

        {/* Card: Objets (placed next to Objectifs) */
        }
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '15px',
          padding: '16px 16px 16px 32px',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#e7e9ff', fontSize: '20px', fontFamily: 'November, sans-serif', textAlign: 'center' }}>Objets</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginTop: '32px' }}>
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
      
      {/* Sound toggle button */}
      <SoundToggleButton />
    </main>
  );
}


