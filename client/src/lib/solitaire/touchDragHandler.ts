import { Card, Suit } from './types';
import { findBestDropTarget, setCurrentBestTarget, updateDropTargetBounds } from './dropTargets';

interface TouchDragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  cards: Card[];
  sourceType: 'tableau' | 'waste' | 'foundation';
  sourceIndex?: number;
  sourceFoundation?: Suit;
  dragElement: HTMLElement | null;
  originalElements: HTMLElement[];
}

class TouchDragHandler {
  private state: TouchDragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    cards: [],
    sourceType: 'tableau',
    dragElement: null,
    originalElements: []
  };

  private animationFrameId: number | null = null;
  private collisionCheckInterval: number | null = null;
  private onDragStartCallback: ((cards: Card[], sourceType: string, sourceIndex?: number, sourceFoundation?: Suit) => void) | null = null;
  private onDragEndCallback: (() => void) | null = null;
  private onDropCallback: ((targetType: 'tableau' | 'foundation', targetIndex?: number, targetFoundation?: Suit) => void) | null = null;

  setCallbacks(
    onDragStart: (cards: Card[], sourceType: string, sourceIndex?: number, sourceFoundation?: Suit) => void,
    onDragEnd: () => void,
    onDrop: (targetType: 'tableau' | 'foundation', targetIndex?: number, targetFoundation?: Suit) => void
  ) {
    this.onDragStartCallback = onDragStart;
    this.onDragEndCallback = onDragEnd;
    this.onDropCallback = onDrop;
  }

  handleTouchStart(
    e: TouchEvent,
    cards: Card[],
    sourceType: 'tableau' | 'waste' | 'foundation',
    sourceIndex?: number,
    sourceFoundation?: Suit
  ) {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    // Prevent default to avoid scrolling and context menu
    e.preventDefault();

    this.state = {
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
      cards,
      sourceType,
      sourceIndex,
      sourceFoundation,
      dragElement: null,
      originalElements: []
    };

    // Create drag preview
    this.createDragPreview(target, rect.left, rect.top);

    // Notify start
    if (this.onDragStartCallback) {
      this.onDragStartCallback(cards, sourceType, sourceIndex, sourceFoundation);
    }

    // Hide original elements (all cards in the stack)
    const cardElements = target.querySelectorAll('[data-card-id]');
    cardElements.forEach((el) => {
      if (el instanceof HTMLElement) {
        el.style.opacity = '0.3';
        this.state.originalElements.push(el);
      }
    });

    // Start collision checking
    updateDropTargetBounds(true);
    this.collisionCheckInterval = window.setInterval(() => {
      this.checkCollision();
    }, 100);

    // Add global touch listeners
    document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
  }

  private handleTouchMove = (e: TouchEvent) => {
    if (!this.state.isDragging || e.touches.length !== 1) return;

    e.preventDefault();

    const touch = e.touches[0];

    // Use requestAnimationFrame for smooth updates
    if (!this.animationFrameId) {
      this.animationFrameId = requestAnimationFrame(() => {
        this.updateDragPreviewPosition(touch.clientX, touch.clientY);
        this.animationFrameId = null;
      });
    }
  };

  private handleTouchEnd = (e: TouchEvent) => {
    if (!this.state.isDragging) return;

    e.preventDefault();

    const touch = e.changedTouches[0];

    // Find drop target at touch position
    const target = this.findDropTargetAtPosition(touch.clientX, touch.clientY);

    // Restore original elements
    this.state.originalElements.forEach((el) => {
      el.style.opacity = '1';
    });

    // Notify drop
    if (target && this.onDropCallback) {
      this.onDropCallback(target.type, target.index, target.suit);
    }

    // Clean up
    this.cleanup();

    // Notify end
    if (this.onDragEndCallback) {
      this.onDragEndCallback();
    }

    // Remove global listeners
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('touchcancel', this.handleTouchEnd);
  };

  private createDragPreview(sourceElement: HTMLElement, left: number, top: number) {
    // Clone the element for drag preview
    const clone = sourceElement.cloneNode(true) as HTMLElement;

    // Style the clone for maximum performance
    clone.style.cssText = `
      position: fixed;
      left: ${left}px;
      top: ${top}px;
      z-index: 99999;
      pointer-events: none;
      opacity: 0.95;
      transform: translate3d(0, 0, 0) scale(1.05);
      transform-origin: top left;
      will-change: transform;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      transition: none;
    `;
    clone.id = 'touch-drag-preview';

    // Add to body
    document.body.appendChild(clone);
    this.state.dragElement = clone;
  }

  private updateDragPreviewPosition(clientX: number, clientY: number) {
    if (!this.state.dragElement) return;

    const deltaX = clientX - this.state.startX;
    const deltaY = clientY - this.state.startY;

    // Use transform for best performance
    this.state.dragElement.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1.05)`;
  }

  private checkCollision() {
    if (!this.state.dragElement || !this.state.isDragging) return;

    const rect = this.state.dragElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Import game state dynamically to avoid circular deps
    import('../stores/useSolitaire').then(({ useSolitaire }) => {
      const gameState = useSolitaire.getState();

      const target = findBestDropTarget(
        rect,
        { x: centerX, y: centerY },
        this.state.cards,
        gameState,
        this.state.sourceType,
        this.state.sourceIndex,
        this.state.sourceFoundation
      );

      setCurrentBestTarget(target);
    });
  }

  private findDropTargetAtPosition(x: number, y: number): { type: 'tableau' | 'foundation'; index?: number; suit?: Suit } | null {
    if (!this.state.dragElement) return null;

    const rect = this.state.dragElement.getBoundingClientRect();

    // Import dynamically
    return new Promise<any>((resolve) => {
      import('../stores/useSolitaire').then(({ useSolitaire }) => {
        const gameState = useSolitaire.getState();

        const target = findBestDropTarget(
          rect,
          { x, y },
          this.state.cards,
          gameState,
          this.state.sourceType,
          this.state.sourceIndex,
          this.state.sourceFoundation
        );

        resolve(target);
      });
    }).then((target) => target);
  }

  private cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.collisionCheckInterval) {
      clearInterval(this.collisionCheckInterval);
      this.collisionCheckInterval = null;
    }

    if (this.state.dragElement) {
      this.state.dragElement.remove();
      this.state.dragElement = null;
    }

    setCurrentBestTarget(null);
    this.state.isDragging = false;
    this.state.originalElements = [];
  }

  isDragging(): boolean {
    return this.state.isDragging;
  }
}

// Singleton instance
export const touchDragHandler = new TouchDragHandler();


