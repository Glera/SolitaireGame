import React from 'react';
import { cn } from '../../lib/utils';

interface PileProps {
  children?: React.ReactNode;
  onClick?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  className?: string;
  style?: React.CSSProperties;
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
  style,
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
    onDrop?.(e);
  };

  return (
    <div
      {...props}
      className={cn(
        "w-20 h-[104px] rounded-lg flex items-center justify-center relative",
        // Show border for foundation piles always, and for empty stock pile
        !props['data-waste-pile'] && (!props['data-stock-pile'] || isEmpty) && "border border-dashed border-teal-500/50 hover:border-teal-400/70 transition-colors duration-200",
        // Show background for empty stock pile
        props['data-stock-pile'] && isEmpty && "bg-teal-600/20",
        onClick && "cursor-pointer",
        className
      )}
      style={{ borderRadius: '0.5rem', ...style }}
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isEmpty && label && (
        <div className="w-full h-full p-1">
          {/* Top rank - like real card */}
          <div className="text-lg font-bold leading-none text-amber-50 opacity-40">
            <div>{label}</div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
