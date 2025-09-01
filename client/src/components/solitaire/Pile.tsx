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
}

export function Pile({ 
  children, 
  onClick, 
  onDrop, 
  onDragOver,
  className,
  isEmpty = false,
  label
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
    // DEBUG: Log pile drop coordinates
    console.log('🎯 Drop on pile', { 
      clientX: e.clientX, 
      clientY: e.clientY,
      isEmpty,
      label 
    });
    onDrop?.(e);
  };

  return (
    <div
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
        <span className="text-xs text-gray-500 font-medium text-center px-1">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
