/**
 * Logger - Structured Logging + CloudWatch Integration
 * 
 * Logging centralizado con soporte para:
 * - CloudWatch (producción)
 * - Console (desarrollo)
 * - Structured logs (JSON)
 * - Correlación de requests (X-Request-ID)
 */

import * as winston from 'winston';
import * as WinstonCloudWatch from 'winston-cloudwatch';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LogContext {
  requestId?: string;
  userId?: string;
  transactionId?: string;
  [key: string]: any;
}

export class Logger {
  private logger: winston.Logger;
  private context: LogContext = {};

  constructor(
    serviceName: string = 'payment-service',
    enableCloudWatch: boolean = process.env.ENABLE_CLOUDWATCH === 'true'
  ) {
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: this.getConsoleFormat()
      })
    ];

    // Agregar CloudWatch en producción
    if (enableCloudWatch) {
      transports.push(
        new WinstonCloudWatch({
          logGroupName: `/ecs/${serviceName}`,
          logStreamName: `${serviceName}-${process.env.NODE_ENV || 'dev'}`,
          awsRegion: process.env.AWS_REGION || 'us-east-1',
          messageFormatter: ({ level, message, meta }: any) =>
            `[${level}] ${message} ${JSON.stringify(meta)}`
        })
      );
    }

    this.logger = winston.createLogger({
      defaultMeta: {
        service: serviceName,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      },
      format: winston.format.json(),
      level: process.env.LOG_LEVEL || 'info',
      transports
    });
  }

  /**
   * Establece contexto para logs futuros
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Log nivel INFO
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, {
      ...this.context,
      ...meta,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log nivel ERROR
   */
  error(message: string, error?: Error | any, meta?: any): void {
    const errorData = error instanceof Error
      ? {
          errorMessage: error.message,
          errorStack: error.stack,
          errorName: error.name
        }
      : error;

    this.logger.error(message, {
      ...this.context,
      ...errorData,
      ...meta,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log nivel WARN
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, {
      ...this.context,
      ...meta,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log nivel DEBUG
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, {
      ...this.context,
      ...meta,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log para eventos críticos (para alertas)
   */
  critical(message: string, error?: Error, meta?: any): void {
    const errorData = error instanceof Error
      ? {
          errorMessage: error.message,
          errorStack: error.stack
        }
      : {};

    this.logger.error(`[CRITICAL] ${message}`, {
      ...this.context,
      ...errorData,
      ...meta,
      severity: 'CRITICAL',
      timestamp: new Date().toISOString()
    });

    // En producción, enviar alerta
    if (process.env.NODE_ENV === 'production') {
      this.sendAlert(message, error, meta);
    }
  }

  /**
   * Middleware para Express - registra requests
   */
  requestMiddleware() {
    return (req: any, res: any, next: any) => {
      const requestId = req.headers['x-request-id'] || 
                       `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      req.requestId = requestId;
      this.setContext({ requestId });

      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.info('HTTP Request', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          durationMs: duration,
          ip: req.ip,
          userId: req.user?.userId
        });
      });

      next();
    };
  }

  /**
   * Middleware para capturar errores no manejados
   */
  errorMiddleware() {
    return (err: any, req: any, res: any, next: any) => {
      this.error('Unhandled Error', err, {
        method: req.method,
        path: req.path,
        requestId: req.requestId,
        userId: req.user?.userId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error interno del servidor',
          requestId: req.requestId
        }
      });
    };
  }

  /**
   * Enviar alerta (Slack, PagerDuty, etc.)
   */
  private sendAlert(message: string, error?: Error, meta?: any): void {
    const alertPayload = {
      title: `🚨 Payment Service Alert`,
      message,
      error: error?.message,
      severity: 'critical',
      timestamp: new Date().toISOString(),
      metadata: meta
    };

    // TODO: Implementar integración con Slack/PagerDuty
    console.error('[Logger] ALERT:', JSON.stringify(alertPayload));
  }

  /**
   * Formato para logs en consola (desarrollo)
   */
  private getConsoleFormat() {
    return winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} [${level}] ${message} ${metaStr}`;
      })
    );
  }
}

/**
 * Instancia singleton
 */
let loggerInstance: Logger | null = null;

export function getLogger(serviceName?: string): Logger {
  if (!loggerInstance) {
    loggerInstance = new Logger(serviceName);
  }
  return loggerInstance;
}

/**
 * Para testing: crear logger de prueba
 */
export function createTestLogger(): Logger {
  return new Logger('payment-service-test', false);
}
