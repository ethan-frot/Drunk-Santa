'use client';

import React, { CSSProperties, useMemo, useRef, useState } from 'react';

type UiImageButtonProps = {
  imageUpSrc: string;
  imageDownSrc: string;
  label?: string;
  heightPx?: number;
  onClick?: () => void;
  onPressDown?: () => void; // for triggering side effects like sprint
  ariaLabel?: string;
  labelStyle?: CSSProperties;
  delayMs?: number; // artificial delay before firing onClick
};

export default function UiImageButton({
  imageUpSrc,
  imageDownSrc,
  label,
  heightPx = 160,
  onClick,
  onPressDown,
  ariaLabel,
  labelStyle,
  delayMs = 50,
}: UiImageButtonProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rootRef = useRef<HTMLButtonElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const rootStyle: CSSProperties = useMemo(() => ({
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    transition: 'transform 0.12s ease',
  }), []);

  const containerStyle: CSSProperties = useMemo(() => ({
    position: 'relative',
    display: 'inline-block',
  }), []);

  const imgStyle: CSSProperties = useMemo(() => ({
    height: `${heightPx}px`,
    width: 'auto',
    display: 'block',
  }), [heightPx]);

  const labelBaseStyle: CSSProperties = useMemo(() => ({
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    pointerEvents: 'none',
    color: '#ffffff',
    fontSize: heightPx >= 150 ? '1.3rem' : '1.1rem',
    fontWeight: 'bold',
    fontFamily: 'November, sans-serif',
    textTransform: 'uppercase',
    transform: 'translateY(-6px)',
  }), [heightPx]);

  const handleMouseEnter = () => {
    const root = rootRef.current;
    if (root) root.style.transform = 'scale(1.05)';
  };

  const handleMouseLeave = () => {
    const root = rootRef.current;
    const labelEl = labelRef.current;
    if (root) root.style.transform = 'scale(1)';
    if (label && labelEl) labelEl.style.transform = 'translateY(-6px)';
    const img = imgRef.current;
    if (img) img.src = imageUpSrc;
  };

  const handleMouseDown = () => {
    const root = rootRef.current;
    const img = imgRef.current;
    const labelEl = labelRef.current;
    if (root) root.style.transform = 'scale(0.98)';
    if (img) img.src = imageDownSrc;
    if (label && labelEl) labelEl.style.transform = 'translate(-12px, 6px)';
    if (onPressDown) onPressDown();
  };

  const handleMouseUp = () => {
    const root = rootRef.current;
    const img = imgRef.current;
    const labelEl = labelRef.current;
    if (root) root.style.transform = 'scale(1.05)';
    if (img) img.src = imageUpSrc;
    if (label && labelEl) labelEl.style.transform = 'translateY(-6px)';
  };

  const handleTouchStart = () => {
    const img = imgRef.current;
    if (img) img.src = imageDownSrc;
    if (onPressDown) onPressDown();
  };

  const handleTouchEnd = () => {
    const img = imgRef.current;
    if (img) img.src = imageUpSrc;
  };

  const handleClick = () => {
    if (isWaiting) return;
    if (!onClick) return;
    setIsWaiting(true);
    setTimeout(() => {
      try { onClick(); } finally { setIsWaiting(false); }
    }, Math.max(0, delayMs));
  };

  return (
    <button
      ref={rootRef}
      onClick={handleClick}
      aria-label={ariaLabel}
      style={rootStyle}
      disabled={isWaiting}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div style={containerStyle}>
        <img
          ref={imgRef}
          src={imageUpSrc}
          alt={ariaLabel || label || 'button'}
          style={imgStyle}
        />
        {label && (
          <span ref={labelRef} style={{ ...labelBaseStyle, ...(labelStyle || {}) }}>{label}</span>
        )}
      </div>
    </button>
  );
}


