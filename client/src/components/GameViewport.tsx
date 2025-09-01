import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

interface GameViewportProps {
  children: React.ReactNode;
  width: number;
  height: number;
  isTestMode: boolean;
}

export function GameViewport({ children, width, height, isTestMode }: GameViewportProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTestMode) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      return;
    }

    const updateScale = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth - 40; // padding
      const containerHeight = container.clientHeight - 40; // padding

      // Calculate scale to fit the viewport
      const scaleX = containerWidth / width;
      const scaleY = containerHeight / height;
      const newScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1

      setScale(newScale);

      // Center the viewport
      const scaledWidth = width * newScale;
      const scaledHeight = height * newScale;
      const x = (containerWidth - scaledWidth) / 2;
      const y = (containerHeight - scaledHeight) / 2;
      
      setPosition({ x, y });
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    
    return () => window.removeEventListener('resize', updateScale);
  }, [width, height, isTestMode]);

  if (!isTestMode) {
    return <div className="w-full h-full">{children}</div>;
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-100 p-5 overflow-hidden">
      <div className="relative w-full h-full">
        {/* Viewport info */}
        <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-mono">
          {width} × {height} ({Math.round(scale * 100)}%)
        </div>

        {/* Device frame */}
        <div
          ref={viewportRef}
          className="bg-white border-2 border-gray-300 shadow-xl rounded-lg overflow-hidden relative"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: 'top left',
          }}
        >
          {/* Viewport content */}
          <div className="w-full h-full overflow-hidden">
            {children}
          </div>

          {/* Grid overlay for alignment */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />
        </div>

        {/* Rulers */}
        {scale > 0.3 && (
          <>
            {/* Horizontal ruler */}
            <div 
              className="absolute top-0 bg-gray-200 border-b border-gray-300 text-xs"
              style={{
                left: `${position.x}px`,
                width: `${width * scale}px`,
                height: '20px'
              }}
            >
              {Array.from({ length: Math.floor(width / 100) + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 border-l border-gray-400 text-gray-600 pl-1"
                  style={{ 
                    left: `${i * 100 * scale}px`,
                    height: '20px',
                    lineHeight: '20px'
                  }}
                >
                  {i * 100}
                </div>
              ))}
            </div>

            {/* Vertical ruler */}
            <div 
              className="absolute left-0 bg-gray-200 border-r border-gray-300 text-xs"
              style={{
                top: `${position.y + 20}px`,
                height: `${height * scale}px`,
                width: '40px'
              }}
            >
              {Array.from({ length: Math.floor(height / 100) + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 border-t border-gray-400 text-gray-600 px-1"
                  style={{ 
                    top: `${i * 100 * scale}px`,
                    width: '40px',
                    height: '20px',
                    lineHeight: '20px',
                    fontSize: '10px'
                  }}
                >
                  {i * 100}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}