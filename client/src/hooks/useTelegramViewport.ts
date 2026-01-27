import { useState, useEffect } from 'react';

interface TelegramViewport {
  height: number;
  width: number;
  isCompact: boolean;
  isTelegramWeb: boolean;
}

/**
 * Hook to get the proper viewport dimensions in Telegram WebApp context
 * Uses Telegram's viewportStableHeight when available, falls back to window dimensions
 */
export function useTelegramViewport(): TelegramViewport {
  const [viewport, setViewport] = useState<TelegramViewport>(() => getViewport());

  useEffect(() => {
    const handleResize = () => {
      setViewport(getViewport());
    };

    window.addEventListener('resize', handleResize);
    
    // Also listen to Telegram viewport changes if available
    const tg = window.Telegram?.WebApp;
    if (tg) {
      // Telegram WebApp has onEvent for viewport changes
      // @ts-ignore - Telegram WebApp typing
      tg.onEvent?.('viewportChanged', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      // @ts-ignore
      tg?.offEvent?.('viewportChanged', handleResize);
    };
  }, []);

  return viewport;
}

function getViewport(): TelegramViewport {
  const tg = window.Telegram?.WebApp;
  
  // Telegram Web (in browser) often has narrower viewport
  // Detect by checking if viewportHeight differs significantly from innerHeight
  const telegramHeight = tg?.viewportStableHeight || tg?.viewportHeight;
  const isTelegramWeb = Boolean(tg && !isMobileTelegram());
  
  // Use Telegram viewport if available and valid
  const height = telegramHeight && telegramHeight > 100 
    ? telegramHeight 
    : window.innerHeight;
  
  const width = window.innerWidth;
  
  // Compact mode for small screens (mobile or small Telegram Web window)
  const isCompact = height < 600 || width < 380;

  return {
    height,
    width,
    isCompact,
    isTelegramWeb
  };
}

/**
 * Detect if running in mobile Telegram vs Telegram Web (browser)
 */
function isMobileTelegram(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  // Mobile Telegram has specific user agent patterns
  return /telegram/i.test(ua) || /tgweb/i.test(ua) || 
    (/mobile|android|iphone|ipad/i.test(ua) && Boolean(window.Telegram?.WebApp));
}

// Extend Window interface for Telegram
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
        onEvent?: (event: string, callback: () => void) => void;
        offEvent?: (event: string, callback: () => void) => void;
      };
    };
  }
}
