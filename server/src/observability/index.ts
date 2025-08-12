// Observability module exports
export { logger, requestLoggingMiddleware, type LogContext, type LogEntry } from './logger.js';
export { 
  metricsCollector, 
  metrics, 
  type MetricData, 
  type CounterMetric, 
  type HistogramMetric 
} from './metrics.js';
export { 
  tracer, 
  tracing, 
  type SpanContext, 
  type SpanData, 
  type Span 
} from './tracing.js';
export { 
  errorTracker, 
  errorHandlingMiddleware, 
  asyncErrorHandler, 
  type ErrorInfo 
} from './errors.js';

// Metrics endpoint for external monitoring
import { Request, Response } from 'express';
import { metricsCollector } from './metrics.js';
import { errorTracker } from './errors.js';

export function createMetricsEndpoint() {
  return (req: Request, res: Response) => {
    const allMetrics = metricsCollector.getAllMetrics();
    
    // Format metrics in Prometheus-like format for Azure Monitor
    const prometheusFormat = formatMetricsForPrometheus(allMetrics);
    
    res.set('Content-Type', 'text/plain');
    res.send(prometheusFormat);
  };
}

function formatMetricsForPrometheus(allMetrics: any): string {
  const lines: string[] = [];
  
  // Add counter metrics
  for (const [name, value] of Object.entries(allMetrics.counters)) {
    lines.push(`# TYPE ${name} counter`);
    lines.push(`${name} ${value}`);
  }
  
  // Add histogram metrics
  for (const [name, stats] of Object.entries(allMetrics.histograms as any)) {
    const histogramStats = stats as { count: number; sum: number; min: number; max: number; avg: number };
    lines.push(`# TYPE ${name} histogram`);
    lines.push(`${name}_count ${histogramStats.count}`);
    lines.push(`${name}_sum ${histogramStats.sum}`);
    lines.push(`${name}_min ${histogramStats.min}`);
    lines.push(`${name}_max ${histogramStats.max}`);
    lines.push(`${name}_avg ${histogramStats.avg}`);
  }
  
  return lines.join('\n') + '\n';
}

// Health check with observability status
export function createHealthCheckEndpoint() {
  return (req: Request, res: Response) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      observability: {
        logging: true,
        metrics: true,
        tracing: true,
        errorTracking: true
      },
      metrics: {
        totalErrors: errorTracker.getErrorCount(),
        ...metricsCollector.getAllMetrics()
      }
    };
    
    res.json(health);
  };
}