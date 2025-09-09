// Global progress manager to connect store with progress bar component
let addPointsFunction: ((points: number) => void) | null = null;

export function setAddPointsFunction(fn: (points: number) => void) {
  addPointsFunction = fn;
}

export function addPointsToProgress(points: number) {
  if (addPointsFunction) {
    addPointsFunction(points);
  } else {
    console.warn('⚠️ Progress bar not initialized yet');
  }
}
