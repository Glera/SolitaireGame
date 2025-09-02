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

// Fix for drag and drop in iframe
export function setupIframeSupport() {
  if (!isInIframe()) {
    return;
  }

  console.log('🖼️ Running in iframe, applying compatibility fixes');

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