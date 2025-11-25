import { useRef, useCallback } from 'react';

interface TouchDragHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

interface UseMobileDragProps {
  onDragStart: (clientX: number, clientY: number, target: HTMLElement) => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: (clientX: number, clientY: number) => void;
  enabled?: boolean;
}

/**
 * Hook to handle touch events for mobile drag and drop
 */
export function useMobileDrag({
  onDragStart,
  onDragMove,
  onDragEnd,
  enabled = true
}: UseMobileDragProps): TouchDragHandlers {
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    
    const touch = e.touches[0];
    if (!touch) return;

    isDraggingRef.current = true;
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    
    onDragStart(touch.clientX, touch.clientY, e.currentTarget as HTMLElement);
  }, [enabled, onDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || !isDraggingRef.current) return;
    
    const touch = e.touches[0];
    if (!touch) return;

    // Prevent scrolling while dragging
    e.preventDefault();
    
    onDragMove(touch.clientX, touch.clientY);
  }, [enabled, onDragMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enabled || !isDraggingRef.current) return;
    
    isDraggingRef.current = false;
    
    const touch = e.changedTouches[0];
    if (!touch) return;

    onDragEnd(touch.clientX, touch.clientY);
  }, [enabled, onDragEnd]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
}






