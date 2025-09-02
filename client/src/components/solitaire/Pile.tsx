import React from 'react';
import { cn } from '../../lib/utils';

interface PileProps {
  children?: React.ReactNode;
  onClick?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  className?: string;
  isEmpty?: boolean;
  label?: string;
  'data-stock-pile'?: boolean;
  'data-waste-pile'?: boolean;
}

export function Pile({ 
  children, 
  onClick, 
  onDrop, 
  onDragOver,
  className,
  isEmpty = false,
  label,
  ...props
}: PileProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver?.(e);
    // Simplified drop zone - always accept drops, let game logic validate
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.borderColor = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).style.borderColor = '';
    // DEBUG: Show popup with pile drop info
    import('../DebugPopup').then(({ showDebugInfo }) => {
      showDebugInfo(
        'Drop on Pile',
        { x: e.clientX, y: e.clientY },
        label || 'Stock/Waste pile',
        { 
          isEmpty,
          pileType: label || 'stock/waste'
        }
      );
    });
    onDrop?.(e);
  };

  return (
    <div
      {...props}
      className={cn(
        "w-16 h-24 rounded-lg border border-dashed border-teal-500/50 flex items-center justify-center relative",
        "hover:border-teal-400/70 transition-colors duration-200",
        onClick && "cursor-pointer",
        className
      )}
      style={{ borderRadius: '0.5rem' }}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isEmpty && label && (
        <div className="w-full h-full p-1 flex flex-col justify-between">
          {/* Top rank - like real card */}
          <div className="text-xs font-bold leading-none text-amber-50 opacity-30">
            <div>{label}</div>
          </div>
          
          {/* Bottom rank (rotated) */}
          <div className="text-xs font-bold leading-none text-amber-50 opacity-30 self-end transform rotate-180">
            <div>{label}</div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
