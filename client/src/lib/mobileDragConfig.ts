// Custom configuration for mobile-drag-drop to improve performance
export function configureMobileDragDrop() {
  // Check if we're on a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!isMobile) return;

  // Override drag image positioning to use transform
  const originalSetDragImage = HTMLElement.prototype.setDragImage;
  
  // Patch the DragEvent interface if polyfill is active
  if ((window as any).dnd_poly_draggable) {
    console.log('📱 Mobile drag-drop detected, applying performance patches');
    
    // Add passive event listeners where possible
    const addPassiveListener = (target: any, type: string, listener: any, options?: any) => {
      const passiveOptions = { passive: false, ...options };
      target.addEventListener(type, listener, passiveOptions);
    };

    // Override to prevent default scroll behavior during drag
    document.addEventListener('touchmove', (e) => {
      if ((window as any).__isDragging) {
        e.preventDefault();
      }
    }, { passive: false });
  }
}

// Apply optimizations when polyfill updates drag image
export function optimizeDragImageRendering() {
  // Find drag image and optimize it
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement && node.classList.contains('dnd-poly-drag-image')) {
          // Force GPU acceleration
          node.style.transform = 'translate3d(0, 0, 0)';
          node.style.willChange = 'transform';
          node.style.backfaceVisibility = 'hidden';
          node.style.webkitBackfaceVisibility = 'hidden';
          
          console.log('✨ Optimized drag image for mobile');
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer.disconnect();
}






