'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import UiImageButton from './UiImageButton';

type HomeButtonProps = {
  topPx?: number;
  leftPx?: number;
  zIndex?: number;
  ariaLabel?: string;
  onClick?: () => void; // optional override
  delayMs?: number;
};

export default function HomeButton({ topPx = 16, leftPx = 16, zIndex = 5, ariaLabel = "Retour à l'accueil", onClick, delayMs }: HomeButtonProps) {
  const router = useRouter();
  return (
    <UiImageButton
      imageUpSrc="/assets/ui/buttons/home-button-up.png"
      imageDownSrc="/assets/ui/buttons/home-button-down.png"
      heightPx={70}
      ariaLabel={ariaLabel}
      onClick={onClick || (() => router.push('/'))}
      delayMs={delayMs}
      gamepadButtons={["Select"]}
      style={{ position: 'absolute', top: `${topPx}px`, left: `${leftPx}px`, width: '140px', height: '70px', background: 'transparent', zIndex, pointerEvents: 'auto' }}
    />
  );
}


