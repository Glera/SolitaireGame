import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Telegram Mini App initialization
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        disableVerticalSwipes: () => void;
        enableClosingConfirmation: () => void;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
      };
    };
  }
}

// Initialize Telegram WebApp if available
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  
  // Tell Telegram the app is ready
  tg.ready();
  
  // Expand to full screen automatically
  tg.expand();
  
  // Disable vertical swipes to prevent accidental closing while playing
  if (tg.disableVerticalSwipes) {
    tg.disableVerticalSwipes();
  }
  
  // Enable closing confirmation to prevent accidental exits
  if (tg.enableClosingConfirmation) {
    tg.enableClosingConfirmation();
  }
  
  console.log('🔷 Telegram WebApp initialized', {
    isExpanded: tg.isExpanded,
    viewportHeight: tg.viewportHeight
  });
}

// Prevent pull-to-refresh and swipe gestures on mobile
document.addEventListener('touchmove', (e) => {
  // If touch is on game board, prevent default to stop Telegram swipe gestures
  const target = e.target as HTMLElement;
  if (target.closest('[data-game-board]')) {
    // Allow scrolling inside modals/popups but prevent on game board itself
    const isInScrollableModal = target.closest('[data-scrollable]');
    if (!isInScrollableModal) {
      e.preventDefault();
    }
  }
}, { passive: false });

// Prevent overscroll on iOS
document.body.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) {
    e.preventDefault(); // Prevent pinch zoom
  }
}, { passive: false });

createRoot(document.getElementById("root")!).render(<App />);
