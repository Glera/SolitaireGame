// Global floating score manager to connect store with floating score component
let addFloatingScoreFunction: ((points: number, x: number, y: number, cardRank: string) => void) | null = null;

export function setAddFloatingScoreFunction(fn: (points: number, x: number, y: number, cardRank: string) => void) {
  addFloatingScoreFunction = fn;
}

export function addFloatingScore(points: number, x: number, y: number, cardRank: string) {
  if (addFloatingScoreFunction) {
    addFloatingScoreFunction(points, x, y, cardRank);
  } else {
    console.warn('⚠️ Floating score manager not initialized yet');
  }
}
