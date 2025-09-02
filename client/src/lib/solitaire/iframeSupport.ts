// Support for iframe embedding
export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    // If accessing window.top throws an error, we're in a cross-origin iframe
    return true;
  }
}

// Check if pointer events are supported
export function supportsPointerEvents(): boolean {
  return 'PointerEvent' in window;
}

// Alternative drag implementation using mouse events for iframe compatibility
export function setupAlternativeDrag() {
  console.log('🔄 Setting up alternative drag for iframe compatibility');
  
  let isDragging = false;
  let draggedElement: HTMLElement | null = null;
  let startPos = { x: 0, y: 0 };
  let currentPos = { x: 0, y: 0 };
  
  // Override drag start with mouse events
  document.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement;
    if (target.getAttribute('draggable') === 'true') {
      e.preventDefault();
      isDragging = true;
      draggedElement = target;
      startPos = { x: e.clientX, y: e.clientY };
      currentPos = startPos;
      
      // Trigger custom drag start
      const dragStartEvent = new CustomEvent('alt-dragstart', {
        detail: { element: target, startPos }
      });
      target.dispatchEvent(dragStartEvent);
    }
  }, { passive: false });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging && draggedElement) {
      e.preventDefault();
      currentPos = { x: e.clientX, y: e.clientY };
      
      // Trigger custom drag move
      const dragMoveEvent = new CustomEvent('alt-dragmove', {
        detail: { element: draggedElement, currentPos, startPos }
      });
      draggedElement.dispatchEvent(dragMoveEvent);
    }
  }, { passive: false });
  
  document.addEventListener('mouseup', (e) => {
    if (isDragging && draggedElement) {
      e.preventDefault();
      
      // Find drop target
      const elementsBelow = document.elementsFromPoint(e.clientX, e.clientY);
      const dropTarget = elementsBelow.find(el => el !== draggedElement && el.getAttribute('data-drop-target'));
      
      // Trigger custom drag end
      const dragEndEvent = new CustomEvent('alt-dragend', {
        detail: { element: draggedElement, dropTarget, endPos: { x: e.clientX, y: e.clientY } }
      });
      draggedElement.dispatchEvent(dragEndEvent);
      
      isDragging = false;
      draggedElement = null;
    }
  }, { passive: false });
}

// Fix for drag and drop in iframe
export function setupIframeSupport() {
  const inIframe = isInIframe();
  
  if (inIframe) {
    console.log('🖼️ Running in iframe, applying compatibility fixes');
  } else {
    console.log('🖥️ Running standalone, applying basic setup');
  }
  
  // Always setup alternative drag for better compatibility
  setupAlternativeDrag();

  // More aggressive drag and drop fixes for cross-origin iframe
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, { capture: true, passive: false });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, { capture: true, passive: false });
  
  document.addEventListener('dragstart', (e) => {
    e.stopPropagation();
  }, { capture: true, passive: false });
  
  document.addEventListener('dragend', (e) => {
    e.stopPropagation();
  }, { capture: true, passive: false });

  // Add iframe-specific styles with more aggressive fixes
  const style = document.createElement('style');
  style.textContent = `
    /* Force drag elements to work in iframe */
    [draggable="true"] {
      -webkit-user-drag: element !important;
      user-select: none !important;
      touch-action: none !important;
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
    }
    
    /* Fix z-index issues in iframe */
    .drag-preview {
      z-index: 2147483647 !important;
      position: fixed !important;
    }
    
    /* Improve touch support in iframe */
    .playing-card {
      touch-action: none !important;
      -webkit-touch-callout: none !important;
      -webkit-user-select: none !important;
    }
    
    /* Ensure proper stacking context and prevent interference */
    body {
      position: relative;
      z-index: 0;
      -webkit-user-drag: auto;
    }
    
    /* Prevent parent frame interference */
    * {
      box-sizing: border-box;
    }
    
    /* Force proper drag cursor */
    [draggable="true"]:active {
      cursor: grabbing !important;
    }
  `;
  document.head.appendChild(style);
  
  // Enable pointer events for better compatibility
  if (supportsPointerEvents()) {
    console.log('📱 Pointer events supported, enabling enhanced drag support');
    document.documentElement.style.touchAction = 'none';
  }
  
  // Force focus to enable drag events in iframe
  window.addEventListener('load', () => {
    document.body.focus();
    
    // Try to communicate with parent frame if possible
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'iframe-ready', dragSupport: true }, '*');
      }
    } catch (e) {
      // Cross-origin - can't communicate
      console.log('🔒 Cross-origin iframe, limited communication');
    }
  });
  
  // Additional fix: ensure mouse events work
  document.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  }, { capture: false });
}