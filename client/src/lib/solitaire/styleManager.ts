// Manages visual feedback styles for drop targets
let lastHighlightedElement: HTMLElement | null = null;

export function applyDropTargetHighlight(element: HTMLElement) {
  // Clear previous highlight if different element
  if (lastHighlightedElement && lastHighlightedElement !== element) {
    clearDropTargetHighlight(lastHighlightedElement);
  }
  
  // Apply highlight styles WITHOUT !important so they can be cleared
  element.style.backgroundColor = 'rgba(34, 197, 94, 0.3)';
  element.style.border = '2px solid rgb(34, 197, 94)';
  
  lastHighlightedElement = element;
  console.log('Applied highlight to element:', element.getAttribute('data-drop-target'));
}

export function clearDropTargetHighlight(element: HTMLElement) {
  // Remove only the highlight-related styles
  element.style.removeProperty('background-color');
  element.style.removeProperty('background');
  element.style.removeProperty('border');
  element.style.removeProperty('border-color');
  element.style.removeProperty('border-width');
  element.style.removeProperty('border-style');
  element.style.removeProperty('outline');
  element.style.removeProperty('box-shadow');
  
  if (element === lastHighlightedElement) {
    lastHighlightedElement = null;
  }
  
  console.log('Cleared highlight from element:', element.getAttribute('data-drop-target'));
}

export function clearAllDropTargetHighlights() {
  console.log('clearAllDropTargetHighlights called');
  
  // Clear the last highlighted element
  if (lastHighlightedElement) {
    clearDropTargetHighlight(lastHighlightedElement);
    lastHighlightedElement = null;
  }
  
  // Also clear any elements with data-drop-target to be absolutely sure
  const allTargets = document.querySelectorAll('[data-drop-target]');
  allTargets.forEach(el => {
    const element = el as HTMLElement;
    // Remove highlight-related styles
    element.style.removeProperty('background-color');
    element.style.removeProperty('background');
    element.style.removeProperty('border');
    element.style.removeProperty('border-color');
    element.style.removeProperty('border-width');
    element.style.removeProperty('border-style');
    element.style.removeProperty('outline');
    element.style.removeProperty('box-shadow');
  });
  
  console.log('All highlights cleared, allTargets count:', allTargets.length);
}