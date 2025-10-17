import React from 'react';
import { renderAlternating } from '@/app/utils/renderAlternating';

interface LoadingCardProps {
  isLoading: boolean;
  dots: number;
  title: string;
  subtitle?: string;
  style?: React.CSSProperties;
}

export function LoadingCard({ 
  isLoading, 
  dots, 
  title, 
  subtitle,
  style 
}: LoadingCardProps) {
  if (!isLoading) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      maxWidth: '1200px',
      margin: '20px',
      ...style
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '15px',
        padding: '40px',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        textAlign: 'center',
        minWidth: '300px'
      }}>
        <div style={{
          fontWeight: 700,
          fontFamily: 'November, system-ui, Arial',
          fontSize: '24px',
          textShadow: '0 2px 0 rgba(0,0,0,0.25)',
          marginBottom: subtitle ? '20px' : '0'
        }}>
          {renderAlternating(`${title}${'.'.repeat(dots)}`, true)}
        </div>
        {subtitle && (
          <div style={{
            fontSize: '16px',
            color: '#b0b0b0',
            opacity: 0.8
          }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
