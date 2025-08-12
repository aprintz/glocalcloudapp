// Simplified OpenTelemetry-like tracing for key operations
// In production, you would use the actual @opentelemetry packages

interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

interface SpanData {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'ok' | 'error' | 'timeout';
  attributes: Record<string, any>;
  events: { timestamp: number; name: string; attributes?: Record<string, any> }[];
  context: SpanContext;
}

class Span {
  private startTime: number;
  private endTime?: number;
  private status: SpanData['status'] = 'ok';
  private attributes: Record<string, any> = {};
  private events: SpanData['events'] = [];

  constructor(
    private name: string,
    private context: SpanContext
  ) {
    this.startTime = Date.now();
  }

  setStatus(status: SpanData['status']) {
    this.status = status;
  }

  setAttribute(key: string, value: any) {
    this.attributes[key] = value;
  }

  setAttributes(attributes: Record<string, any>) {
    Object.assign(this.attributes, attributes);
  }

  addEvent(name: string, attributes?: Record<string, any>) {
    this.events.push({
      timestamp: Date.now(),
      name,
      attributes
    });
  }

  end() {
    this.endTime = Date.now();
    const spanData: SpanData = {
      name: this.name,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.endTime - this.startTime,
      status: this.status,
      attributes: this.attributes,
      events: this.events,
      context: this.context
    };

    tracer.emit('span-end', spanData);
    return spanData;
  }

  getContext(): SpanContext {
    return this.context;
  }
}

class SimpleTracer {
  private listeners: ((event: string, data: any) => void)[] = [];
  private activeSpan: Span | null = null;

  startSpan(name: string, parentSpan?: Span): Span {
    const traceId = parentSpan?.getContext().traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const parentSpanId = parentSpan?.getContext().spanId;

    const span = new Span(name, {
      traceId,
      spanId,
      parentSpanId
    });

    this.activeSpan = span;
    this.emit('span-start', { name, context: span.getContext() });
    return span;
  }

  getActiveSpan(): Span | null {
    return this.activeSpan;
  }

  // Utility method to wrap async operations with tracing
  async trace<T>(
    name: string, 
    operation: (span: Span) => Promise<T>,
    parentSpan?: Span
  ): Promise<T> {
    const span = this.startSpan(name, parentSpan);
    try {
      const result = await operation(span);
      span.setStatus('ok');
      return result;
    } catch (error: any) {
      span.setStatus('error');
      span.setAttribute('error.message', error.message);
      span.setAttribute('error.name', error.name);
      span.addEvent('exception', {
        'exception.type': error.name,
        'exception.message': error.message,
        'exception.stacktrace': error.stack
      });
      throw error;
    } finally {
      span.end();
    }
  }

  // Utility method for synchronous operations
  traceSync<T>(
    name: string,
    operation: (span: Span) => T,
    parentSpan?: Span
  ): T {
    const span = this.startSpan(name, parentSpan);
    try {
      const result = operation(span);
      span.setStatus('ok');
      return result;
    } catch (error: any) {
      span.setStatus('error');
      span.setAttribute('error.message', error.message);
      span.setAttribute('error.name', error.name);
      span.addEvent('exception', {
        'exception.type': error.name,
        'exception.message': error.message,
        'exception.stacktrace': error.stack
      });
      throw error;
    } finally {
      span.end();
    }
  }

  on(listener: (event: string, data: any) => void) {
    this.listeners.push(listener);
  }

  emit(event: string, data: any) {
    this.listeners.forEach(listener => listener(event, data));
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private generateSpanId(): string {
    return `span_${Math.random().toString(36).substr(2, 8)}`;
  }
}

export const tracer = new SimpleTracer();

// Set up span logging
tracer.on((event: string, data: any) => {
  if (event === 'span-end') {
    const spanData = data as SpanData;
    // Log span data in structured format for external observability systems
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'span',
      ...spanData
    }));
  }
});

// Common tracing utilities for specific operations
export const tracing = {
  // Database operation tracing
  async traceDbQuery<T>(
    query: string,
    operation: () => Promise<T>,
    parentSpan?: Span
  ): Promise<T> {
    return tracer.trace('db.query', async (span) => {
      span.setAttributes({
        'db.operation': 'query',
        'db.statement': query.substring(0, 200), // Truncate long queries
        'db.system': 'postgresql'
      });
      return operation();
    }, parentSpan);
  },

  // CMS operation tracing
  async traceCmsOperation<T>(
    operation: string,
    path: string,
    fn: () => Promise<T>,
    parentSpan?: Span
  ): Promise<T> {
    return tracer.trace('cms.operation', async (span) => {
      span.setAttributes({
        'cms.operation': operation,
        'cms.path': path,
        'cms.system': 'strapi'
      });
      return fn();
    }, parentSpan);
  },

  // Event ingestion tracing
  async traceEventIngest<T>(
    eventType: string,
    fn: () => Promise<T>,
    parentSpan?: Span
  ): Promise<T> {
    return tracer.trace('event.ingest', async (span) => {
      span.setAttributes({
        'event.type': eventType,
        'event.system': 'geospatial'
      });
      return fn();
    }, parentSpan);
  },

  // Geospatial query tracing
  async traceGeoQuery<T>(
    queryType: string,
    fn: () => Promise<T>,
    parentSpan?: Span
  ): Promise<T> {
    return tracer.trace('geo.query', async (span) => {
      span.setAttributes({
        'geo.query_type': queryType,
        'geo.system': 'postgis'
      });
      return fn();
    }, parentSpan);
  }
};

export type { SpanContext, SpanData, Span };