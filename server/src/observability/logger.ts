import { Request, Response, NextFunction } from 'express';

// Structured logging interface
interface LogContext {
  requestId?: string;
  userId?: string;
  specId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  error?: string;
  [key: string]: any;
}

interface LogEntry extends LogContext {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

class StructuredLogger {
  private context: LogContext = {};

  setContext(context: Partial<LogContext>) {
    this.context = { ...this.context, ...context };
  }

  clearContext() {
    this.context = {};
  }

  private log(level: LogEntry['level'], message: string, additionalContext: Partial<LogContext> = {}) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...additionalContext
    };

    // In production, you might want to use a structured logging library like winston
    // For now, we'll use console with structured JSON
    const output = JSON.stringify(entry);
    
    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'debug':
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  info(message: string, context?: Partial<LogContext>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Partial<LogContext>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Partial<LogContext>) {
    this.log('error', message, context);
  }

  debug(message: string, context?: Partial<LogContext>) {
    this.log('debug', message, context);
  }
}

export const logger = new StructuredLogger();

// Express middleware for request logging with context
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  // Extract user context from headers or request
  const userId = req.header('x-user-id') || req.header('authorization')?.split(' ')[1] || 'anonymous';
  const specId = req.header('x-spec-id') || req.query.spec_id as string || undefined;
  
  // Set logging context for this request
  logger.setContext({
    requestId,
    userId,
    specId,
    method: req.method,
    path: req.path
  });

  // Log incoming request
  logger.info('Incoming request', {
    query: req.query,
    headers: sanitizeHeaders(req.headers)
  });

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      statusCode: res.statusCode,
      duration,
      responseSize: res.get('content-length')
    });

    // Clear context after request
    logger.clearContext();
    
    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };
  // Remove sensitive headers
  delete sanitized.authorization;
  delete sanitized['x-app-key'];
  delete sanitized.cookie;
  return sanitized;
}

export type { LogContext, LogEntry };