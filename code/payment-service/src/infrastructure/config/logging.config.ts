/**
 * Logging Configuration - Winston logger setup
 */

import winston from 'winston';
import path from 'path';

/**
 * Environment variables
 */
const {
  NODE_ENV = 'development',
  LOG_LEVEL = 'info',
  LOG_DIR = 'logs',
} = process.env;

const isDevelopment = NODE_ENV === 'development';

/**
 * Custom log level colors
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

/**
 * Custom format for log messages
 */
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr ? '\n' + metaStr : ''}${stackStr}`;
  }),
);

/**
 * Configure transports
 */
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      format,
    ),
  }),
];

if (!isDevelopment) {
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.uncolorize(),
        format,
      ),
      maxsize: 10485760,
      maxFiles: 5,
    }),
  );

  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: winston.format.combine(
        winston.format.uncolorize(),
        format,
      ),
      maxsize: 10485760,
      maxFiles: 7,
    }),
  );
}

/**
 * Create main logger instance
 */
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format,
  transports,
  defaultMeta: {
    service: 'payment-service',
    environment: NODE_ENV,
  },
});

/**
 * Logger interface for modules
 */
export interface ILogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: any): void;
}

/**
 * Create module-specific logger
 */
export function createLogger(module: string): ILogger {
  return {
    debug: (message: string, meta?: any) =>
      logger.debug(message, { ...meta, module }),

    info: (message: string, meta?: any) =>
      logger.info(message, { ...meta, module }),

    warn: (message: string, meta?: any) =>
      logger.warn(message, { ...meta, module }),

    error: (message: string, error?: any) =>
      logger.error(message, { module, error }),
  };
}

export default logger;