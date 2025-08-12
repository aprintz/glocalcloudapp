// Performance metrics collection
interface MetricData {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
  unit?: string;
}

interface CounterMetric {
  increment(value?: number, tags?: Record<string, string>): void;
  get(): number;
}

interface HistogramMetric {
  record(value: number, tags?: Record<string, string>): void;
  getStats(): { count: number; sum: number; min: number; max: number; avg: number };
}

class InMemoryCounter implements CounterMetric {
  private value = 0;
  
  increment(value = 1, tags?: Record<string, string>): void {
    this.value += value;
    metricsCollector.emit('counter', {
      name: this.name,
      value: this.value,
      timestamp: new Date().toISOString(),
      tags,
      unit: 'count'
    });
  }
  
  get(): number {
    return this.value;
  }
  
  constructor(private name: string) {}
}

class InMemoryHistogram implements HistogramMetric {
  private values: number[] = [];
  
  record(value: number, tags?: Record<string, string>): void {
    this.values.push(value);
    // Keep only last 1000 values to prevent memory issues
    if (this.values.length > 1000) {
      this.values = this.values.slice(-1000);
    }
    
    metricsCollector.emit('histogram', {
      name: this.name,
      value,
      timestamp: new Date().toISOString(),
      tags,
      unit: this.unit
    });
  }
  
  getStats() {
    if (this.values.length === 0) {
      return { count: 0, sum: 0, min: 0, max: 0, avg: 0 };
    }
    
    const sum = this.values.reduce((a, b) => a + b, 0);
    const min = Math.min(...this.values);
    const max = Math.max(...this.values);
    const avg = sum / this.values.length;
    
    return { count: this.values.length, sum, min, max, avg };
  }
  
  constructor(private name: string, private unit = 'ms') {}
}

class MetricsCollector {
  private counters = new Map<string, CounterMetric>();
  private histograms = new Map<string, HistogramMetric>();
  private listeners: ((type: string, data: MetricData) => void)[] = [];
  
  counter(name: string): CounterMetric {
    if (!this.counters.has(name)) {
      this.counters.set(name, new InMemoryCounter(name));
    }
    return this.counters.get(name)!;
  }
  
  histogram(name: string, unit = 'ms'): HistogramMetric {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new InMemoryHistogram(name, unit));
    }
    return this.histograms.get(name)!;
  }
  
  // Timer utility for measuring duration
  timer(name: string, tags?: Record<string, string>) {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        this.histogram(name).record(duration, tags);
        return duration;
      }
    };
  }
  
  // Event listener for metrics (useful for external monitoring systems)
  on(listener: (type: string, data: MetricData) => void) {
    this.listeners.push(listener);
  }
  
  emit(type: string, data: MetricData) {
    this.listeners.forEach(listener => listener(type, data));
  }
  
  // Get all current metrics for reporting
  getAllMetrics() {
    const result: { counters: any; histograms: any } = {
      counters: {},
      histograms: {}
    };
    
    for (const [name, counter] of this.counters) {
      result.counters[name] = counter.get();
    }
    
    for (const [name, histogram] of this.histograms) {
      result.histograms[name] = histogram.getStats();
    }
    
    return result;
  }
}

export const metricsCollector = new MetricsCollector();

// Common metrics
export const metrics = {
  // Request metrics
  requestCount: metricsCollector.counter('http_requests_total'),
  requestDuration: metricsCollector.histogram('http_request_duration_ms'),
  requestErrors: metricsCollector.counter('http_request_errors_total'),
  
  // CMS metrics
  cmsRequestCount: metricsCollector.counter('cms_requests_total'),
  cmsRequestDuration: metricsCollector.histogram('cms_request_duration_ms'),
  cmsCacheHits: metricsCollector.counter('cms_cache_hits_total'),
  cmsCacheMisses: metricsCollector.counter('cms_cache_misses_total'),
  
  // Event ingestion metrics
  eventIngestCount: metricsCollector.counter('event_ingest_total'),
  eventIngestDuration: metricsCollector.histogram('event_ingest_duration_ms'),
  eventIngestErrors: metricsCollector.counter('event_ingest_errors_total'),
  
  // Geospatial query metrics
  geoQueryCount: metricsCollector.counter('geo_queries_total'),
  geoQueryDuration: metricsCollector.histogram('geo_query_duration_ms'),
  geoQueryResultCount: metricsCollector.histogram('geo_query_results_count', 'count'),
  
  // Database metrics
  dbQueryCount: metricsCollector.counter('db_queries_total'),
  dbQueryDuration: metricsCollector.histogram('db_query_duration_ms'),
  dbConnectionErrors: metricsCollector.counter('db_connection_errors_total'),
  
  // Notification metrics (placeholder for when notifications are implemented)
  notificationsSent: metricsCollector.counter('notifications_sent_total'),
  notificationErrors: metricsCollector.counter('notification_errors_total')
};

export type { MetricData, CounterMetric, HistogramMetric };