'use client';

import React, { CSSProperties, useMemo, useRef, useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import SoundManager from '@/app/utils/soundManager';
import MusicManager from '@/app/utils/musicManager';
import GamepadManager, { GamepadLogicalButton } from '@/app/utils/gamepadManager';

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
  gamepadButtons?: GamepadLogicalButton[]; // optional list of gamepad buttons that activate this UI button
  gamepadHintRightPx?: number; // optional override for icon horizontal position from right
  gamepadHintKey?: GamepadLogicalButton; // optional: show hint without binding inputs
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
  cooldownAfterClickMs = 250,
  disableAnimationsWhenDisabled = true,
  gamepadButtons,
  gamepadHintRightPx,
  gamepadHintKey,
}: UiImageButtonProps, ref: React.Ref<UiImageButtonHandle>) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rootRef = useRef<HTMLButtonElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const animRef = useRef<HTMLDivElement | null>(null); // layer used for scale animations to avoid clobbering parent transforms
  const hintImgRef = useRef<HTMLImageElement | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [cooldownUntilTs, setCooldownUntilTs] = useState<number>(0);
  const [isGamepadConnected, setIsGamepadConnected] = useState<boolean>(false);
  // no sprite hints anymore

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
    const hint = hintImgRef.current;
    if (hint) hint.style.transform = 'translateY(-50%)';
  };

  const handleMouseDown = () => {
    if (isDisabled && disableAnimationsWhenDisabled) return;
    const layer = animRef.current;
    const img = imgRef.current;
    const labelEl = labelRef.current;
    if (layer) layer.style.transform = 'scale(0.98)';
    if (img) img.src = imageDownSrc;
    if (label && labelEl) labelEl.style.transform = 'translate(-12px, 6px)';
    const hint = hintImgRef.current;
    if (hint) hint.style.transform = 'translate(calc(-18px), calc(-50% + 10px))';
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
    const hint = hintImgRef.current;
    if (hint) hint.style.transform = 'translateY(-50%)';
  };

  const handleTouchStart = () => {
    if (isDisabled && disableAnimationsWhenDisabled) return;
    const img = imgRef.current;
    if (img) img.src = imageDownSrc;
    const hint = hintImgRef.current;
    if (hint) hint.style.transform = 'translate(calc(-18px), calc(-50% + 10px))';
    if (onPressDown) onPressDown();
  };

  const handleTouchEnd = () => {
    const img = imgRef.current;
    if (img) img.src = imageUpSrc;
    const hint = hintImgRef.current;
    if (hint) hint.style.transform = 'translateY(-50%)';
  };

  const handleClick = () => {
    if (isDisabled) return;
    if (!onClick) return;
    
    // Play button click sound
    SoundManager.getInstance().playButtonClick();
    
    // Start music on user interaction if it should be playing
    MusicManager.getInstance().startMusicOnInteraction();
    
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
      const hint = hintImgRef.current;
      if (layer) layer.style.transform = 'scale(0.98)';
      if (img) img.src = imageDownSrc;
      if (label && labelEl) labelEl.style.transform = 'translate(-12px, 6px)';
      if (hint) hint.style.transform = 'translate(calc(-18px), calc(-50% + 10px))';
      setTimeout(() => {
        if (layer) layer.style.transform = 'scale(1.05)';
        if (img) img.src = imageUpSrc;
        if (label && labelEl) labelEl.style.transform = 'translateY(-6px)';
        if (hint) hint.style.transform = 'translateY(-50%)';
      }, Math.max(60, durationMs));
    }
  }), [imageDownSrc, imageUpSrc, label]);

  // Gamepad integration: trigger the same animation and click when mapped buttons are pressed
  useEffect(() => {
    if (!gamepadButtons || gamepadButtons.length === 0) return;
    const set = new Set(gamepadButtons);
    const unsubscribe = GamepadManager.getInstance().addListener((btn) => {
      if (!set.has(btn)) return;
      if (isDisabled) return;
      // Animate press and trigger click
      try {
        const layer = animRef.current;
        const img = imgRef.current;
        const labelEl = labelRef.current;
        const hint = hintImgRef.current;
        if (layer) layer.style.transform = 'scale(0.98)';
        if (img) img.src = imageDownSrc;
        if (label && labelEl) labelEl.style.transform = 'translate(-12px, 6px)';
        if (hint) hint.style.transform = 'translate(calc(-12px), calc(-50% + 6px))';
        setTimeout(() => {
          if (layer) layer.style.transform = 'scale(1.05)';
          if (img) img.src = imageUpSrc;
          if (label && labelEl) labelEl.style.transform = 'translateY(-6px)';
          if (hint) hint.style.transform = 'translateY(-50%)';
        }, 150);
      } catch {}
      handleClick();
    });
    return unsubscribe;
  }, [gamepadButtons, isDisabled, imageDownSrc, imageUpSrc, label, delayMs, cooldownAfterClickMs, onClick]);

  // Gamepad connection state for hint display
  useEffect(() => {
    const unsub = GamepadManager.getInstance().addConnectionListener((connected) => {
      setIsGamepadConnected(connected);
    });
    return unsub;
  }, []);

  const hintSrc = useMemo(() => {
    if (!isGamepadConnected) return '';
    const key = gamepadHintKey || (gamepadButtons && gamepadButtons.length > 0 ? gamepadButtons[0] : undefined);
    if (!key) return '';
    switch (key) {
      case 'A': return '/assets/ui/buttons/gamepad/a-buttons.png';
      case 'B': return '/assets/ui/buttons/gamepad/b-buttons.png';
      case 'X': return '/assets/ui/buttons/gamepad/x-button.png';
      case 'Y': return '/assets/ui/buttons/gamepad/y-buttons.png';
      default: return '';
    }
  }, [isGamepadConnected, gamepadButtons, gamepadHintKey]);

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
        {(label || (hintSrc && isGamepadConnected)) && (
          <span ref={labelRef} style={{
            ...labelBaseStyle,
            ...(labelStyle || {}),
            position: 'absolute'
          }}>
            <span>{label}</span>
          </span>
        )}
        {(hintSrc && isGamepadConnected) && (
          <img
            ref={hintImgRef}
            src={hintSrc}
            alt="gamepad-hint"
            style={{
              position: 'absolute',
              right: typeof gamepadHintRightPx === 'number' ? `${gamepadHintRightPx}px` : '30px',
              top: '45%',
              transform: 'translateY(-50%)',
              height: 26,
              width: 'auto',
              pointerEvents: 'none',
              userSelect: 'none'
            }}
          />
        )}
      </div>
    </button>
  );
}

const UiImageButton = forwardRef<UiImageButtonHandle, UiImageButtonProps>(UiImageButtonInner);
export default UiImageButton;


