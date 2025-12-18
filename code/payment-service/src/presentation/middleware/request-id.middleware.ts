/**
 * Request ID Middleware - Adds unique request tracking and tracing
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../config/logging.config';

const log = createLogger('RequestIdMiddleware');

/**
 * Extended Request with request metadata
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      correlationId?: string;
      startTime?: number;
      endTime?: number;
      duration?: number;
    }
  }
}

/**
 * Request ID Middleware
 * Generates unique request IDs for tracing and correlation
 */
export class RequestIdMiddleware {
  /**
   * Generate UUID v4 request ID
   */
  private generateRequestId(): string {
    return `req-${uuidv4()}`;
  }

  /**
   * Extract or generate correlation ID
   */
  private getCorrelationId(req: Request): string {
    const headerCorrelationId = req.headers['x-correlation-id'] as string;
    const headerTraceId = req.headers['x-trace-id'] as string;

    if (headerCorrelationId) {
      return headerCorrelationId;
    }

    if (headerTraceId) {
      return headerTraceId;
    }

    return this.generateRequestId();
  }

  /**
   * Main middleware handler
   */
  handler = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const requestId = this.generateRequestId();
      const correlationId = this.getCorrelationId(req);
      const startTime = Date.now();

      req.requestId = requestId;
      req.correlationId = correlationId;
      req.startTime = startTime;

      res.setHeader('X-Request-ID', requestId);
      res.setHeader('X-Correlation-ID', correlationId);

      log.debug('Request received', {
        requestId,
        correlationId,
        method: req.method,
        path: req.path,
        ip: req.ip,
      });

      const originalEnd = res.end;

      res.end = function (...args: any[]) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        req.endTime = endTime;
        req.duration = duration;

        const statusCode = res.statusCode;
        const level = statusCode >= 400 ? 'warn' : 'info';

        log[level as keyof typeof log](`Request completed`, {
          requestId,
          method: req.method,
          path: req.path,
          statusCode,
          duration: `${duration}ms`,
          correlationId,
        });

        originalEnd.apply(res, args);
      };

      next();
    } catch (error) {
      log.error('Request ID middleware error', error);
      next(error);
    }
  };

  /**
   * Get request metadata
   */
  static getRequestMetadata(req: Request): {
    requestId?: string;
    correlationId?: string;
    duration?: number;
    statusCode?: number;
  } {
    return {
      requestId: req.requestId,
      correlationId: req.correlationId,
      duration: req.duration,
      statusCode: undefined,
    };
  }

  /**
   * Generate trace headers for external calls
   */
  static getTraceHeaders(req: Request): Record<string, string> {
    return {
      'X-Request-ID': req.requestId || `req-${uuidv4()}`,
      'X-Correlation-ID': req.correlationId || `req-${uuidv4()}`,
      'X-Trace-ID': req.requestId || `req-${uuidv4()}`,
      'User-Agent': 'payment-service/1.0',
    };
  }

  /**
   * Log request with metadata
   */
  static logWithContext(logger: any, level: string, message: string, meta: any, req?: Request) {
    const metadata = {
      ...meta,
      requestId: req?.requestId,
      correlationId: req?.correlationId,
    };

    logger[level](message, metadata);
  }

  /**
   * Generate distributed trace parent
   */
  static generateTraceParent(): string {
    const version = '00';
    const traceId = uuidv4().replace(/-/g, '');
    const parentId = uuidv4().replace(/-/g, '').substring(0, 16);
    const flags = '01';

    return `${version}-${traceId}-${parentId}-${flags}`;
  }

  /**
   * Parse trace parent
   */
  static parseTraceParent(traceParent: string): {
    version: string;
    traceId: string;
    parentId: string;
    flags: string;
  } | null {
    const parts = traceParent.split('-');

    if (parts.length !== 4) {
      return null;
    }

    return {
      version: parts[0],
      traceId: parts[1],
      parentId: parts[2],
      flags: parts[3],
    };
  }

  /**
   * Create child trace ID from parent
   */
  static createChildTraceId(parentTraceParent: string): string {
    const parsed = this.parseTraceParent(parentTraceParent);

    if (!parsed) {
      return this.generateTraceParent();
    }

    const newParentId = uuidv4().replace(/-/g, '').substring(0, 16);

    return `${parsed.version}-${parsed.traceId}-${newParentId}-${parsed.flags}`;
  }

  /**
   * Measure operation duration
   */
  static async measureDuration<T>(
    operation: () => Promise<T>,
    logger?: any,
    operationName?: string,
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      if (logger && operationName) {
        logger.debug(`Operation completed`, {
          operation: operationName,
          duration: `${duration}ms`,
        });
      }

      return { result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;

      if (logger && operationName) {
        logger.error(`Operation failed`, {
          operation: operationName,
          duration: `${duration}ms`,
          error,
        });
      }

      throw error;
    }
  }
}