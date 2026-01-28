// Debug logger that captures logs for display in custom popup
// Useful for debugging in environments without console access (like Telegram WebView)

interface LogEntry {
  timestamp: Date;
  type: 'log' | 'warn' | 'error';
  message: string;
}

const MAX_LOGS = 200;
const logs: LogEntry[] = [];
let onLogsChangedCallback: (() => void) | null = null;

// Intercept console methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function addLog(type: LogEntry['type'], args: any[]) {
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  logs.push({
    timestamp: new Date(),
    type,
    message
  });

  // Keep only last MAX_LOGS entries
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  onLogsChangedCallback?.();
}

// Override console methods to capture logs
console.log = function(...args: any[]) {
  addLog('log', args);
  originalLog.apply(console, args);
};

console.warn = function(...args: any[]) {
  addLog('warn', args);
  originalWarn.apply(console, args);
};

console.error = function(...args: any[]) {
  addLog('error', args);
  originalError.apply(console, args);
};

export function getLogs(): LogEntry[] {
  return [...logs];
}

export function clearLogs(): void {
  logs.length = 0;
  onLogsChangedCallback?.();
}

export function setOnLogsChangedCallback(callback: (() => void) | null): void {
  onLogsChangedCallback = callback;
}

export function formatLogsForCopy(): string {
  return logs.map(log => {
    const time = log.timestamp.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3 
    });
    const prefix = log.type === 'error' ? '❌' : log.type === 'warn' ? '⚠️' : '';
    return `[${time}] ${prefix}${log.message}`;
  }).join('\n');
}

// Log startup message
console.log('🚀 Debug logger initialized');
