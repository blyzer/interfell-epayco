/**
 * Rate Limit Middleware - Token bucket algorithm implementation
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../config/logging.config';

const log = createLogger('RateLimitMiddleware');

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  requestsPerWindow: number;
  windowSizeMs: number;
  keyGenerator?: (req: Request) => string;
}

/**
 * Token bucket interface
 */
interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Rate Limit Middleware
 * Implements token bucket algorithm for rate limiting
 */
export class RateLimitMiddleware {
  private buckets: Map<string, TokenBucket> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      requestsPerWindow: config.requestsPerWindow || 100,
      windowSizeMs: config.windowSizeMs || 60000,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
    };

    this.startCleanup();
  }

  /**
   * Default key generator - uses IP address
   */
  private defaultKeyGenerator = (req: Request): string => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  };

  /**
   * Check if request is allowed
   */
  private isAllowed(key: string, tokensNeeded: number = 1): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.config.requestsPerWindow,
        lastRefill: now,
      };
      this.buckets.set(key, bucket);
    }

    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = (timePassed / this.config.windowSizeMs) * this.config.requestsPerWindow;

    bucket.tokens = Math.min(
      this.config.requestsPerWindow,
      bucket.tokens + tokensToAdd,
    );

    bucket.lastRefill = now;

    if (bucket.tokens >= tokensNeeded) {
      bucket.tokens -= tokensNeeded;
      return true;
    }

    return false;
  }

  /**
   * Get remaining tokens for key
   */
  getRemainingTokens(key: string): number {
    const bucket = this.buckets.get(key);

    if (!bucket) {
      return this.config.requestsPerWindow;
    }

    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = (timePassed / this.config.windowSizeMs) * this.config.requestsPerWindow;

    const tokens = Math.min(
      this.config.requestsPerWindow,
      bucket.tokens + tokensToAdd,
    );

    return Math.floor(tokens);
  }

  /**
   * Get reset time for key (milliseconds until bucket refills)
   */
  getResetTime(key: string): number {
    const bucket = this.buckets.get(key);

    if (!bucket) {
      return 0;
    }

    const timePassed = Date.now() - bucket.lastRefill;
    const resetTime = Math.max(0, this.config.windowSizeMs - timePassed);

    return Math.ceil(resetTime / 1000);
  }

  /**
   * Main middleware handler
   */
  handler = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const key = this.config.keyGenerator!(req);
      const allowed = this.isAllowed(key);
      const remaining = this.getRemainingTokens(key);
      const resetTime = this.getResetTime(key);

      res.set({
        'X-RateLimit-Limit': String(this.config.requestsPerWindow),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(resetTime),
      });

      if (!allowed) {
        log.warn('Rate limit exceeded', {
          key,
          limit: this.config.requestsPerWindow,
          requestId: req.requestId,
        });

        res.status(429).json({
          statusCode: 429,
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Maximum ${this.config.requestsPerWindow} requests per ${this.config.windowSizeMs / 1000} seconds`,
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
          retryAfter: resetTime,
        });
        return;
      }

      log.debug('Rate limit check passed', {
        key: key.substring(0, 10),
        remaining,
        requestId: req.requestId,
      });

      next();
    } catch (error) {
      log.error('Rate limit error', error);

      res.status(500).json({
        statusCode: 500,
        code: 'RATE_LIMIT_ERROR',
        message: 'Rate limit check failed',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  };

  /**
   * Reset rate limit for specific key
   */
  reset(key: string): void {
    this.buckets.delete(key);
    log.debug(`Rate limit reset for key: ${key}`);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.buckets.clear();
    log.info('All rate limits reset');
  }

  /**
   * Start periodic cleanup of old buckets
   */
  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, bucket] of this.buckets.entries()) {
        const inactiveTime = now - bucket.lastRefill;

        if (inactiveTime > this.config.windowSizeMs * 10) {
          this.buckets.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        log.debug(`Rate limit cleanup completed`, {
          removedBuckets: cleanedCount,
        });
      }
    }, 60000);
  }

  /**
   * Get bucket count
   */
  getBucketCount(): number {
    return this.buckets.size;
  }

  /**
   * Get config
   */
  getConfig(): RateLimitConfig {
    return this.config;
  }

  /**
   * Custom key generator for authenticated users
   */
  static userKeyGenerator = (req: Request): string => {
    if (req.user?.userId) {
      return `user-${req.user.userId}`;
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  };

  /**
   * Custom key generator for API keys
   */
  static apiKeyGenerator = (req: Request): string => {
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      return `apikey-${apiKey}`;
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  };
}