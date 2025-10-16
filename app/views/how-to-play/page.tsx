'use client';

import { useState } from 'react';
import HowToPlayModal from '@/app/components/HowToPlayModal';

export default function HowToPlayPage() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b1220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <h1 style={{ fontFamily: 'Novem, Arial, sans-serif', color: '#e7e9ff', margin: 0 }}>How to Play</h1>
        <button onClick={() => setOpen(true)} style={{ padding: '10px 16px', borderRadius: 10, border: '2px solid #e7e9ff', background: 'transparent', color: '#e7e9ff', cursor: 'pointer' }}>
          Comment jouer
        </button>
      </div>
      <HowToPlayModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}


