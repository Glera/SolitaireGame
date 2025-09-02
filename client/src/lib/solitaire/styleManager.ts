// Manages visual feedback styles for drop targets
const originalStyles = new Map<HTMLElement, string>();

export function applyDropTargetHighlight(element: HTMLElement) {
  // Save original style if not already saved
  if (!originalStyles.has(element)) {
    originalStyles.set(element, element.getAttribute('style') || '');
  }
  
  // Apply highlight styles
  element.style.backgroundColor = 'rgba(34, 197, 94, 0.3)';
  element.style.border = '2px solid rgb(34, 197, 94)';
}

export function clearDropTargetHighlight(element: HTMLElement) {
  // Restore original style
  const originalStyle = originalStyles.get(element);
  if (originalStyle !== undefined) {
    element.setAttribute('style', originalStyle);
  } else {
    // If no original style was saved, clear completely
    element.removeAttribute('style');
  }
}

export function clearAllDropTargetHighlights() {
  const allTargets = document.querySelectorAll('[data-drop-target]');
  allTargets.forEach(el => {
    clearDropTargetHighlight(el as HTMLElement);
  });
  // Clear the map after resetting all styles
  originalStyles.clear();
}