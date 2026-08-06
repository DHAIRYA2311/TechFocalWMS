import React from 'react';

export default function TechFocalLoader({ color = 'var(--color-primary)' }) {
  const text = "TECHFOCAL";
  const letters = text.split('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
      <style>
        {`
          @keyframes rotateLetter {
            0% { transform: rotateY(0deg); }
            28.5% { transform: rotateY(360deg); }
            100% { transform: rotateY(360deg); }
          }
        `}
      </style>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', perspective: '400px' }}>
        {letters.map((char, index) => (
          <span
            key={`${index}-${char}`}
            style={{
              display: 'inline-block',
              fontSize: '28px',
              fontWeight: '900',
              letterSpacing: '2px',
              margin: '0 1px',
              color: color,
              transformOrigin: 'center center',
              animation: 'rotateLetter 2.8s infinite',
              animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              animationDelay: `${index * 0.1}s`
            }}
          >
            {char}
          </span>
        ))}
      </div>
      <span style={{ fontSize: '14px', color: 'var(--color-text-muted)', fontWeight: '500' }}>
        Loading TechFocal WMS...
      </span>
    </div>
  );
}
