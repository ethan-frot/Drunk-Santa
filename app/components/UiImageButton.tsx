'use client';

import React, { CSSProperties, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';

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
  style?: CSSProperties; // allow positioning overrides
  disabled?: boolean; // externally controlled disabled state
  cooldownAfterClickMs?: number; // additional cooldown after click where button stays disabled
  disableAnimationsWhenDisabled?: boolean; // when disabled, suppress hover/press animations
};

export type UiImageButtonHandle = {
  triggerPress: (durationMs?: number) => void;
};

function UiImageButtonInner({
  imageUpSrc,
  imageDownSrc,
  label,
  heightPx = 160,
  onClick,
  onPressDown,
  ariaLabel,
  labelStyle,
  delayMs = 50,
  style,
  disabled = false,
  cooldownAfterClickMs = 0,
  disableAnimationsWhenDisabled = true,
}: UiImageButtonProps, ref: React.Ref<UiImageButtonHandle>) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rootRef = useRef<HTMLButtonElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const animRef = useRef<HTMLDivElement | null>(null); // layer used for scale animations to avoid clobbering parent transforms
  const [isWaiting, setIsWaiting] = useState(false);
  const [cooldownUntilTs, setCooldownUntilTs] = useState<number>(0);

  const rootStyle: CSSProperties = useMemo(() => ({
    background: 'transparent',
    border: 'none',
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    cursor: 'pointer',
  }), []);

  const containerStyle: CSSProperties = useMemo(() => ({
    position: 'relative',
    display: 'inline-block',
    transition: 'transform 0.12s ease',
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
    textAlign: 'center',
    lineHeight: 1.1,
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    maxWidth: "95%",
  }), [heightPx]);

  const isInCooldown = cooldownUntilTs > Date.now();
  const isDisabled = disabled || isWaiting || isInCooldown;

  const handleMouseEnter = () => {
    if (isDisabled && disableAnimationsWhenDisabled) return;
    const layer = animRef.current;
    if (layer) layer.style.transform = 'scale(1.05)';
  };

  const handleMouseLeave = () => {
    const root = rootRef.current;
    const labelEl = labelRef.current;
    const layer = animRef.current;
    if (layer) layer.style.transform = 'scale(1)';
    if (label && labelEl) labelEl.style.transform = 'translateY(-6px)';
    const img = imgRef.current;
    if (img) img.src = imageUpSrc;
  };

  const handleMouseDown = () => {
    if (isDisabled && disableAnimationsWhenDisabled) return;
    const layer = animRef.current;
    const img = imgRef.current;
    const labelEl = labelRef.current;
    if (layer) layer.style.transform = 'scale(0.98)';
    if (img) img.src = imageDownSrc;
    if (label && labelEl) labelEl.style.transform = 'translate(-12px, 6px)';
    if (onPressDown) onPressDown();
  };

  const handleMouseUp = () => {
    if (isDisabled && disableAnimationsWhenDisabled) return;
    const layer = animRef.current;
    const img = imgRef.current;
    const labelEl = labelRef.current;
    if (layer) layer.style.transform = 'scale(1.05)';
    if (img) img.src = imageUpSrc;
    if (label && labelEl) labelEl.style.transform = 'translateY(-6px)';
  };

  const handleTouchStart = () => {
    if (isDisabled && disableAnimationsWhenDisabled) return;
    const img = imgRef.current;
    if (img) img.src = imageDownSrc;
    if (onPressDown) onPressDown();
  };

  const handleTouchEnd = () => {
    const img = imgRef.current;
    if (img) img.src = imageUpSrc;
  };

  const handleClick = () => {
    if (isDisabled) return;
    if (!onClick) return;
    setIsWaiting(true);
    setTimeout(() => {
      try { onClick(); } finally {
        setIsWaiting(false);
        if (cooldownAfterClickMs > 0) {
          const until = Date.now() + Math.max(0, cooldownAfterClickMs);
          setCooldownUntilTs(until);
          setTimeout(() => {
            // Expire cooldown
            setCooldownUntilTs((prev) => (prev === until ? 0 : prev));
          }, Math.max(0, cooldownAfterClickMs));
        }
      }
    }, Math.max(0, delayMs));
  };

  useImperativeHandle(ref, () => ({
    triggerPress: (durationMs = 150) => {
      const layer = animRef.current;
      const img = imgRef.current;
      const labelEl = labelRef.current;
      if (layer) layer.style.transform = 'scale(0.98)';
      if (img) img.src = imageDownSrc;
      if (label && labelEl) labelEl.style.transform = 'translate(-12px, 6px)';
      setTimeout(() => {
        if (layer) layer.style.transform = 'scale(1.05)';
        if (img) img.src = imageUpSrc;
        if (label && labelEl) labelEl.style.transform = 'translateY(-6px)';
      }, Math.max(60, durationMs));
    }
  }), [imageDownSrc, imageUpSrc, label]);

  return (
    <button
      ref={rootRef}
      onClick={handleClick}
      aria-label={ariaLabel}
      style={{
        ...rootStyle,
        ...(style || {}),
        ...(isDisabled ? { cursor: 'not-allowed' } : {})
      }}
      disabled={isDisabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div ref={animRef} style={containerStyle}>
        <img
          ref={imgRef}
          src={imageUpSrc}
          alt={ariaLabel || label || 'button'}
          style={{
            ...imgStyle,
            ...(isDisabled ? { filter: 'grayscale(15%)', opacity: 0.75 } : {})
          }}
        />
        {label && (
          <span ref={labelRef} style={{
            ...labelBaseStyle,
            ...(labelStyle || {})
          }}>{label}</span>
        )}
      </div>
    </button>
  );
}

const UiImageButton = forwardRef<UiImageButtonHandle, UiImageButtonProps>(UiImageButtonInner);
export default UiImageButton;


