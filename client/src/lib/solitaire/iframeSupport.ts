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

  // Prevent default drag behavior that might conflict with iframe
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
  }, false);

  document.addEventListener('drop', (e) => {
    e.preventDefault();
  }, false);

  // Add iframe-specific styles
  const style = document.createElement('style');
  style.textContent = `
    /* Ensure drag elements work in iframe */
    [draggable="true"] {
      -webkit-user-drag: element;
      user-select: none;
      touch-action: none;
    }
    
    /* Fix z-index issues in iframe */
    .drag-preview {
      z-index: 999999 !important;
    }
    
    /* Improve touch support in iframe */
    .playing-card {
      touch-action: none;
      -webkit-touch-callout: none;
    }
    
    /* Ensure proper stacking context */
    body {
      position: relative;
      z-index: 0;
    }
  `;
  document.head.appendChild(style);
  
  // Enable pointer events for better compatibility
  if (supportsPointerEvents()) {
    console.log('📱 Pointer events supported, enabling enhanced drag support');
    document.documentElement.style.touchAction = 'none';
  }
}