/**
 * Authentication Guard Middleware - JWT token validation with RBAC
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createLogger } from '../config/logging.config';

const log = createLogger('AuthGuard');

/**
 * JWT payload interface
 */
export interface JwtPayload {
  userId: string;
  walletId: string;
  role: 'ADMIN' | 'USER' | 'SERVICE';
  iat?: number;
  exp?: number;
}

/**
 * Extended request with user info
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      requestId?: string;
    }
  }
}

/**
 * Authentication Guard Middleware
 * Validates JWT tokens and enforces role-based access control
 */
export class AuthGuardMiddleware {
  private readonly jwtSecret: string;
  private readonly jwtExpiry: string;

  constructor(
    jwtSecret: string = process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiry: string = process.env.JWT_EXPIRY || '24h',
  ) {
    this.jwtSecret = jwtSecret;
    this.jwtExpiry = jwtExpiry;
  }

  /**
   * Extract token from Authorization header
   */
  private extractToken(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Verify JWT token
   */
  private verifyToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;
      return decoded;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        log.warn('Token expired', {
          expiredAt: error.expiredAt,
        });
      } else if (error.name === 'JsonWebTokenError') {
        log.warn('Invalid token', {
          message: error.message,
        });
      } else {
        log.warn('Token verification failed', {
          error: error.message,
        });
      }
      return null;
    }
  }

  /**
   * Main middleware handler
   */
  handler = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      const token = this.extractToken(authHeader);

      if (!token) {
        log.debug('No token provided', {
          path: req.path,
          requestId: req.requestId,
        });

        res.status(401).json({
          statusCode: 401,
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
        return;
      }

      const payload = this.verifyToken(token);

      if (!payload) {
        log.warn('Invalid or expired token', {
          path: req.path,
          requestId: req.requestId,
        });

        res.status(401).json({
          statusCode: 401,
          code: 'INVALID_TOKEN',
          message: 'Token is invalid or expired',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
        return;
      }

      req.user = payload;

      log.debug('Token verified successfully', {
        userId: payload.userId,
        role: payload.role,
        requestId: req.requestId,
      });

      next();
    } catch (error) {
      log.error('Auth guard error', error);

      res.status(500).json({
        statusCode: 500,
        code: 'AUTH_ERROR',
        message: 'Authentication error',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      });
    }
  };

  /**
   * Create JWT token
   */
  createToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    try {
      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpiry,
      });

      log.debug('Token created', {
        userId: payload.userId,
        role: payload.role,
      });

      return token;
    } catch (error) {
      log.error('Failed to create token', error);
      throw error;
    }
  }

  /**
   * Verify token is valid
   */
  isTokenValid(token: string): boolean {
    return this.verifyToken(token) !== null;
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(): string {
    return this.jwtExpiry;
  }

  /**
   * Role-based authorization middleware
   */
  requireRole(...roles: JwtPayload['role'][]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          statusCode: 401,
          code: 'MISSING_USER',
          message: 'User information not available',
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
        return;
      }

      if (!roles.includes(req.user.role)) {
        log.warn('Insufficient permissions', {
          userId: req.user.userId,
          requiredRoles: roles,
          userRole: req.user.role,
          requestId: req.requestId,
        });

        res.status(403).json({
          statusCode: 403,
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `This endpoint requires one of roles: ${roles.join(', ')}`,
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        });
        return;
      }

      next();
    };
  }
}