import React from 'react';

interface MiniCardPackProps {
  color: string;
  stars: number;
  size?: number;
}

export const MiniCardPack: React.FC<MiniCardPackProps> = ({ color, stars, size = 48 }) => {
  const topRow = stars > 3 ? Math.ceil(stars / 2) : stars;
  const bottomRow = stars > 3 ? stars - topRow : 0;
  const scale = size / 48;
  const cardHeight = size * 1.33; // Card aspect ratio ~3:4
  
  // Generate unique ID for gradient to avoid conflicts when multiple instances exist
  const gradientId = `packShineMini-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div 
      className="relative flex items-center justify-center" 
      style={{ width: size, height: cardHeight }}
    >
      <svg 
        width={size} 
        height={cardHeight} 
        viewBox="0 0 36 48" 
        fill="none"
        style={{
          filter: `drop-shadow(0 2px 4px ${color}60)`,
        }}
      >
        {/* Single card */}
        <rect x="0" y="0" width="36" height="48" rx="4" fill={color} />
        {/* Shine effect */}
        <rect x="0" y="0" width="36" height="48" rx="4" fill={`url(#${gradientId})`} />
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="36" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.15)" />
          </linearGradient>
        </defs>
      </svg>
      {/* Rarity stars centered on the card */}
      {stars > 0 && (
        <div 
          className="absolute flex flex-col items-center justify-center"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="flex justify-center gap-0">
            {Array.from({ length: topRow }).map((_, i) => (
              <span 
                key={i} 
                style={{ 
                  fontSize: `${10 * scale}px`,
                  color: '#fbbf24',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                  textShadow: '0 0 4px rgba(251, 191, 36, 0.8)',
                }}
              >
                ★
              </span>
            ))}
          </div>
          {bottomRow > 0 && (
            <div className="flex justify-center gap-0" style={{ marginTop: -2 * scale }}>
              {Array.from({ length: bottomRow }).map((_, i) => (
                <span 
                  key={i} 
                  style={{ 
                    fontSize: `${10 * scale}px`,
                    color: '#fbbf24',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                    textShadow: '0 0 4px rgba(251, 191, 36, 0.8)',
                  }}
                >
                  ★
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
