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
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop?.(e);
  };

  return (
    <div
      className={cn(
        "w-16 h-24 rounded-xl border-2 border-dashed border-teal-500/50 flex items-center justify-center relative",
        "hover:border-teal-400/70 transition-colors duration-200",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      onDragOver={handleDragOver}
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
