// Performance monitoring utility
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private enabled = true;
  
  start(name: string) {
    if (!this.enabled) return;
    this.timers.set(name, performance.now());
  }
  
  end(name: string) {
    if (!this.enabled) return;
    const startTime = this.timers.get(name);
    if (startTime === undefined) return;
    
    const duration = performance.now() - startTime;
    this.timers.delete(name);
    
    const metric = {
      name,
      duration,
      timestamp: Date.now()
    };
    
    this.metrics.push(metric);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
    
    // Log slow operations (> 5ms)
    if (duration > 5) {
      console.warn(`⚠️ Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    }
  }
  
  getMetrics() {
    return this.metrics;
  }
  
  getAverages() {
    const grouped = new Map<string, number[]>();
    
    this.metrics.forEach(metric => {
      if (!grouped.has(metric.name)) {
        grouped.set(metric.name, []);
      }
      grouped.get(metric.name)!.push(metric.duration);
    });
    
    const averages: { name: string; avg: number; count: number; max: number }[] = [];
    
    grouped.forEach((durations, name) => {
      const sum = durations.reduce((a, b) => a + b, 0);
      const avg = sum / durations.length;
      const max = Math.max(...durations);
      averages.push({ name, avg, count: durations.length, max });
    });
    
    return averages.sort((a, b) => b.avg - a.avg);
  }
  
  reset() {
    this.metrics = [];
    this.timers.clear();
  }
  
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

export const perfMonitor = new PerformanceMonitor();

// Helper function to measure async operations
export async function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  perfMonitor.start(name);
  try {
    return await fn();
  } finally {
    perfMonitor.end(name);
  }
}

// Helper function to measure sync operations
export function measureSync<T>(name: string, fn: () => T): T {
  perfMonitor.start(name);
  try {
    return fn();
  } finally {
    perfMonitor.end(name);
  }
}