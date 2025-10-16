'use client';

import React from 'react';
import UiImageButton from './UiImageButton';

type ModalButton = {
  imageUpSrc: string;
  imageDownSrc: string;
  label?: string;
  heightPx: number;
  onClick: () => void;
  ariaLabel?: string;
};

type ImageModalProps = {
  backgroundSrc: string;
  content: React.ReactNode; // center text/content inside the image
  offsetTopPercent?: number; // where to vertically position content relative to the image (default ~32)
  buttons: ModalButton[];
  widthPx?: number; // default 540
};

export default function ImageModal({
  backgroundSrc,
  content,
  offsetTopPercent = 32,
  buttons,
  widthPx = 540,
}: ImageModalProps) {
  return (
    <div style={{ position: 'relative', width: `${widthPx}px`, maxWidth: '92vw' }}>
      <img
        src={backgroundSrc}
        alt="modal"
        style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))' }}
      />

      {/* Centered content relative to the image */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: `${offsetTopPercent}%`, transform: 'translateY(-50%)', display: 'grid', placeItems: 'center', padding: '0 8%' }}>
        {content}
      </div>

      {/* Buttons row under the image */}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '12px' }}>
        {buttons.map((b, idx) => (
          <UiImageButton
            key={idx}
            imageUpSrc={b.imageUpSrc}
            imageDownSrc={b.imageDownSrc}
            label={b.label}
            heightPx={b.heightPx}
            onClick={b.onClick}
            ariaLabel={b.ariaLabel}
          />
        ))}
      </div>
    </div>
  );
}


