'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import UiImageButton from './UiImageButton';
import GamepadManager from '@/app/utils/gamepadManager';
import { UiImageButtonHandle } from './UiImageButton';

type ModalButton = {
  imageUpSrc: string;
  imageDownSrc: string;
  label?: string;
  heightPx: number;
  onClick: () => void;
  ariaLabel?: string;
  disabled?: boolean;
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
  // Only A and B should be active while modal is mounted
  const left = useMemo(() => buttons[0], [buttons]);
  const right = useMemo(() => buttons[buttons.length - 1], [buttons]);
  const leftRef = useRef<UiImageButtonHandle | null>(null);
  const rightRef = useRef<UiImageButtonHandle | null>(null);

  useEffect(() => {
    // Scope handler: consume A/B for modal buttons
    const unsubscribe = GamepadManager.getInstance().pushScope((btn) => {
      if (btn === ('A' as any)) {
        try { rightRef.current?.triggerPress(150); } catch {}
        // Delay real action slightly to avoid bubbling to underlying A handlers
        setTimeout(() => { try { right?.onClick?.(); } catch {} }, 120);
        // Suppress further A events briefly
        try { GamepadManager.getInstance().suppress('A' as any, 180); } catch {}
        return true;
      }
      if (btn === ('B' as any)) {
        try { leftRef.current?.triggerPress(150); } catch {}
        setTimeout(() => { try { left?.onClick?.(); } catch {} }, 120);
        try { GamepadManager.getInstance().suppress('B' as any, 180); } catch {}
        return true;
      }
      // Block other inputs while modal is open
      if (btn !== ('A' as any) && btn !== ('B' as any)) return true;
      return false;
    });
    return unsubscribe;
  }, [left, right]);
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
            disabled={b.disabled}
            ref={idx === 0 ? leftRef : (idx === buttons.length - 1 ? rightRef : undefined) as any}
            // No per-button gamepad bindings inside modal; handled by scoped capture above
            gamepadHintKey={idx === 0 ? ('B' as any) : (idx === buttons.length - 1 ? ('A' as any) : undefined)}
            gamepadHintRightPx={40}
          />
        ))}
      </div>
    </div>
  );
}


