'use client';

import React from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function HowToPlayModal({ open, onClose }: Props) {
  const scale = 1.2;
  const s = (n: number) => Math.round(n * scale);
  const iconCol = s(120);
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div style={{
        width: 'min(1200px, 98vw)',
        height: 'min(98vh, 1200px)',
        borderRadius: 16,
        overflow: 'hidden',
        border: 'none',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        backgroundColor: 'transparent'
      }}>
        <div style={{ height: '100%', overflowY: 'auto', padding: 16, paddingLeft: 64, paddingTop: 96, paddingBottom: 72, display: 'flex', flexDirection: 'column', gap: 16, backgroundImage: 'url(/assets/how-to-play-bg.png)', backgroundSize: 'cover', backgroundPosition: 'top center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'local' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, padding: 8, fontFamily: 'Novem, Arial, sans-serif', color: '#600000', fontSize: s(36) }}>Comment jouer</h2>
            <button aria-label="Fermer" title="Fermer" onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#8a8a8a', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontFamily: 'Novem, Arial, sans-serif', fontSize: s(28), lineHeight: 1, fontWeight: 700 }}>X</button>
          </div>
          {/* Section 1: Controls */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 16 }}>
            <h3 style={{ fontFamily: 'Novem, Arial, sans-serif', color: '#600000', margin: 0, fontSize: s(28) }}>Controles</h3>
            <div style={{ display: 'grid', gridTemplateColumns: `${iconCol}px 1fr`, alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, justifySelf: 'center' }}>
                <img src={'/assets/Q.png'} alt="Q" width={s(56)} height={s(56)} style={{ objectFit: 'contain' }} />
                <img src={'/assets/D.png'} alt="D" width={s(56)} height={s(56)} style={{ objectFit: 'contain' }} />
              </div>
              <span style={{ color: '#600000', fontFamily: 'Novem, Arial, sans-serif', fontSize: s(24) }}>: Deplacements</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `${iconCol}px 1fr`, alignItems: 'center', gap: 10 }}>
              <img src={'/assets/space.png'} alt="Space" width={s(120)} height={s(56)} style={{ objectFit: 'contain', justifySelf: 'center' }} />
              <span style={{ color: '#600000', fontFamily: 'Novem, Arial, sans-serif', fontSize: s(24) }}>: Dash</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `${iconCol}px 1fr`, alignItems: 'center', gap: 10 }}>
              <img src={'/assets/leftClick.png'} alt="Left Click" width={s(56)} height={s(56)} style={{ objectFit: 'contain', justifySelf: 'center' }} />
              <span style={{ color: '#600000', fontFamily: 'Novem, Arial, sans-serif', fontSize: s(24) }}>: Lancer boule de neige</span>
            </div>
          </section>

          {/* Section 2: Objectives */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16 }}>
            <h3 style={{ fontFamily: 'Novem, Arial, sans-serif', color: '#600000', margin: 0, fontSize: s(28) }}>Objectifs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `${iconCol}px 1fr`, alignItems: 'center', gap: 10 }}>
                <img src={'/assets/snowflake.png'} alt="snowflake" width={s(64)} height={s(64)} style={{ objectFit: 'contain' }} />
                <span style={{ color: '#600000', fontFamily: 'Novem, Arial, sans-serif', fontSize: s(24) }}>: Recupere les flocons</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `${iconCol}px 1fr`, alignItems: 'center', gap: 10 }}>
                <div style={{ width: s(56), height: s(56), borderRadius: s(56), background: 'radial-gradient(#ffffff, #d1d5db)', boxShadow: '0 2px 10px rgba(255,255,255,0.35), inset 0 -4px 8px rgba(0,0,0,0.15)' }} />
                <span style={{ color: '#600000', fontFamily: 'Novem, Arial, sans-serif', fontSize: s(24) }}>: Enneige les ennemis</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `${iconCol}px 1fr`, alignItems: 'center', gap: 10 }}>
                <img src={'/assets/upgrade.png'} alt="upgrade" width={s(64)} height={s(64)} style={{ objectFit: 'contain', transform: 'rotate(-90deg)' }} />
                <span style={{ color: '#600000', fontFamily: 'Novem, Arial, sans-serif', fontSize: s(24) }}>: Ameliore tes attributs</span>
              </div>
            </div>
          </section>

          {/* Section 3: Items */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
            <h3 style={{ fontFamily: 'Novem, Arial, sans-serif', color: '#600000', margin: 0, fontSize: s(28) }}>Objets</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(260px, 1fr))', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={'/assets/gift1.png'} alt="gift1" width={s(64)} height={s(64)} style={{ objectFit: 'contain' }} />
                <span style={{ color: '#600000', fontFamily: 'Novem, Arial, sans-serif', fontSize: s(22) }}>: Double points</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={'/assets/anti-boost-slowly.png'} alt="anti-boost" width={s(64)} height={s(64)} style={{ objectFit: 'contain' }} />
                <span style={{ color: '#600000', fontFamily: 'Novem, Arial, sans-serif', fontSize: s(22) }}>: Vous immobilise</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={'/assets/gift3.png'} alt="gift3" width={s(64)} height={s(64)} style={{ objectFit: 'contain' }} />
                <span style={{ color: '#600000', fontFamily: 'Novem, Arial, sans-serif', fontSize: s(22) }}>: Super boules de neige</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={'/assets/vodka.png'} alt="vodka" width={s(64)} height={s(64)} style={{ objectFit: 'contain' }} />
                <span style={{ color: '#600000', fontFamily: 'Novem, Arial, sans-serif', fontSize: s(22) }}>: Bonus de deplacement</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={'/assets/gift2.png'} alt="gift2" width={s(64)} height={s(64)} style={{ objectFit: 'contain' }} />
                <span style={{ color: '#600000', fontFamily: 'Novem, Arial, sans-serif', fontSize: s(22) }}>: +500 points</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


