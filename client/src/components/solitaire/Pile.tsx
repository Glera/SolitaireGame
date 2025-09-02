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
        "w-16 h-24 rounded-lg flex items-center justify-center relative",
        // Only show border for non-stock-pile components
        !props['data-stock-pile'] && "border-2 border-dashed border-blue-400 bg-blue-400/10 hover:border-green-400 hover:bg-green-400/20 transition-colors duration-200",
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
        <div className="w-full h-full p-1">
          {/* Top rank - like real card */}
          <div className="text-xs font-bold leading-none text-amber-50 opacity-30">
            <div>{label}</div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
