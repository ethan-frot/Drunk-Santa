import React from 'react';
import { renderAlternating } from '@/app/utils/renderAlternating';

type TitleBannerProps = {
  text: string;
  startWithRed?: boolean;
  backgroundSrc: string;
  widthPx?: number;
  heightPx?: number;
  fixedTop?: boolean;
  topOffsetPx?: number;
  fontSizeRem?: number;
  subtitleText?: string;
  subtitleStartWithRed?: boolean;
  subtitleFontSizeRem?: number;
};

export function TitleBanner({
  text,
  startWithRed = true,
  backgroundSrc,
  widthPx = 640,
  heightPx = 160,
  fixedTop = true,
  topOffsetPx = 40,
  fontSizeRem = 3,
  subtitleText,
  subtitleStartWithRed = false,
  subtitleFontSizeRem = 2,
}: TitleBannerProps) {
  return (
    <div
      style={{
        position: fixedTop ? 'fixed' : 'relative',
        top: fixedTop ? `${topOffsetPx}px` : undefined,
        left: fixedTop ? '50%' : undefined,
        transform: fixedTop ? 'translateX(-50%)' : undefined,
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        backgroundImage: `url('${backgroundSrc}')`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: fixedTop ? '0 auto 8px' : '10px auto 0',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transform: subtitleText ? 'translateY(-14px)' : 'translateY(-6px)' }}>
        <h1
          style={{
            fontSize: `${fontSizeRem}rem`,
            margin: '0 0 8px 0',
            textAlign: 'center',
            textShadow: '0 0 20px rgba(231, 233, 255, 0.3)'
          }}
        >
          {renderAlternating(text, startWithRed)}
        </h1>
        {subtitleText && (
          <div
            style={{
              fontSize: `${subtitleFontSizeRem}rem`,
              lineHeight: 1.05,
              textAlign: 'center',
              textShadow: '0 0 12px rgba(231, 233, 255, 0.25)'
            }}
          >
            {renderAlternating(subtitleText, subtitleStartWithRed)}
          </div>
        )}
      </div>
    </div>
  );
}

export default TitleBanner;


