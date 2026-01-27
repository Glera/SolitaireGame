import React from 'react';

interface StarsRewardProps {
  stars: number;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  glow?: boolean;
}

const sizeConfig = {
  sm: {
    starSize: 'text-xl',
    countSize: '0.75rem',
    countOffset: { right: '-7px', bottom: '-7px' },
  },
  md: {
    starSize: 'text-2xl',
    countSize: '0.95rem',
    countOffset: { right: '-10px', bottom: '-10px' },
  },
  lg: {
    starSize: 'text-3xl',
    countSize: '1.1rem',
    countOffset: { right: '-12px', bottom: '-12px' },
  },
};

export const StarsReward: React.FC<StarsRewardProps> = ({ 
  stars, 
  size = 'md',
  pulse = false,
  glow = false,
}) => {
  const config = sizeConfig[size];
  
  return (
    <div className="relative">
      <span 
        className={`${config.starSize} transition-transform duration-150 inline-block ${pulse ? 'scale-125' : 'scale-100'}`}
        style={{
          filter: glow 
            ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))'
            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
        }}
      >
        ⭐
      </span>
      <span 
        className="absolute font-bold text-white"
        style={{ 
          fontSize: config.countSize,
          right: config.countOffset.right, 
          bottom: config.countOffset.bottom, 
          textShadow: '0 0 3px rgba(0,0,0,1), 0 1px 2px rgba(0,0,0,0.9), 1px 1px 0 rgba(0,0,0,0.8), -1px -1px 0 rgba(0,0,0,0.8)',
        }}
      >
        {stars}
      </span>
    </div>
  );
};
