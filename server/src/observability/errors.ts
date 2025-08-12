import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';
import { metrics } from './metrics.js';
import { tracer } from './tracing.js';

interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
  requestId?: string;
  userId?: string;
  context?: Record<string, any>;
}

class ErrorTracker {
  private errorCount = 0;

  captureException(error: Error | any, context?: Record<string, any>): string {
    this.errorCount++;
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    const errorInfo: ErrorInfo = {
      name: error.name || 'UnknownError',
      message: error.message || 'Unknown error occurred',
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      context
    };

    // Log structured error
    logger.error('Exception captured', {
      errorId,
      errorName: errorInfo.name,
      errorMessage: errorInfo.message,
      errorStack: errorInfo.stack,
      errorCode: errorInfo.code,
      statusCode: errorInfo.statusCode,
      context: errorInfo.context,
      errorCount: this.errorCount
    });

    // Increment error metrics
    metrics.requestErrors.increment(1, {
      error_type: errorInfo.name,
      status_code: String(errorInfo.statusCode || 500)
    });

    return errorId;
  }

  getErrorCount(): number {
    return this.errorCount;
  }
}

export const errorTracker = new ErrorTracker();

// Express error handling middleware
export function errorHandlingMiddleware(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const errorId = errorTracker.captureException(error, {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: req.headers,
    body: req.body
  });

  // Set error status on active span if exists
  const activeSpan = tracer.getActiveSpan();
  if (activeSpan) {
    activeSpan.setStatus('error');
    activeSpan.setAttribute('error.id', errorId);
    activeSpan.setAttribute('error.message', error.message);
  }

  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      id: errorId,
      message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : message,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    }
  });
}

// Async error wrapper for route handlers
export function asyncErrorHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export type { ErrorInfo };