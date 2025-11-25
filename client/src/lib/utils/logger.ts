// Performance-optimized logger that disables logs on mobile devices
const isMobile = typeof window !== 'undefined' && 
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Disable all logs on mobile for better performance
const ENABLE_LOGS = !isMobile;

export const logger = {
  log: (...args: any[]) => {
    if (ENABLE_LOGS) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (ENABLE_LOGS) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors
    console.error(...args);
  },
  debug: (...args: any[]) => {
    if (ENABLE_LOGS) {
      console.debug(...args);
    }
  }
};


