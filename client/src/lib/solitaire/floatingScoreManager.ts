// Global floating score manager to connect store with floating score component
let addFloatingScoreFunction: ((points: number, x: number, y: number, cardRank: string, isPremium?: boolean) => void) | null = null;

export function setAddFloatingScoreFunction(fn: (points: number, x: number, y: number, cardRank: string, isPremium?: boolean) => void) {
  addFloatingScoreFunction = fn;
}

export function addFloatingScore(points: number, x: number, y: number, cardRank: string, isPremium?: boolean) {
  // console.log(`🎯 FloatingScoreManager: addFloatingScore called with ${points} points for ${cardRank} at (${x}, ${y})`);
  if (addFloatingScoreFunction) {
    // console.log(`✅ FloatingScoreManager: Function exists, calling it`);
    addFloatingScoreFunction(points, x, y, cardRank, isPremium);
  } else {
    console.warn('⚠️ Floating score manager not initialized yet');
  }
}
