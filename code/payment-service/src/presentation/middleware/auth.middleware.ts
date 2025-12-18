/**
 * AuthMiddleware - JWT Authentication
 * 
 * Valida JWT en headers Authorization.
 * Previene acceso no autorizado.
 * 
 * Uso: app.use(authMiddleware)
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    merchantId?: string;
    role: string;
    iat: number;
    exp: number;
  };
}

export class AuthMiddleware {
  private readonly jwtSecret: string;

  constructor(jwtSecret: string = process.env.JWT_SECRET || 'change-me-in-prod') {
    this.jwtSecret = jwtSecret;
  }

  /**
   * Middleware que valida JWT
   */
  authenticate = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_AUTH',
            message: 'Authorization header requerido: Bearer <token>'
          }
        });
        return;
      }

      const token = authHeader.substring(7); // Remover "Bearer "

      // Validar y decodificar JWT
      const decoded = jwt.verify(token, this.jwtSecret) as any;

      // Adjuntar usuario a request
      req.user = {
        userId: decoded.userId,
        merchantId: decoded.merchantId,
        role: decoded.role || 'user',
        iat: decoded.iat,
        exp: decoded.exp
      };

      console.log(`[Auth] ✓ Usuario autenticado: ${req.user.userId}`);
      next();
    } catch (error) {
      console.warn('[Auth] ✗ Token inválido:', (error as any).message);

      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token expiró'
          }
        });
        return;
      }

      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token inválido'
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Error autenticando'
        }
      });
    }
  };

  /**
   * Middleware que verifica role específico
   */
  requireRole = (allowedRoles: string[]) => {
    return (
      req: AuthenticatedRequest,
      res: Response,
      next: NextFunction
    ): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: { code: 'NOT_AUTHENTICATED', message: 'No autenticado' }
        });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Role requerido: ${allowedRoles.join(', ')}`
          }
        });
        return;
      }

      next();
    };
  };

  /**
   * Genera un JWT (para testing o login)
   */
  generateToken(payload: {
    userId: string;
    merchantId?: string;
    role?: string;
  }): string {
    const token = jwt.sign(
      {
        userId: payload.userId,
        merchantId: payload.merchantId,
        role: payload.role || 'user'
      },
      this.jwtSecret,
      {
        expiresIn: '24h',
        algorithm: 'HS256'
      }
    );

    return token;
  }
}

/**
 * Factory para crear middleware
 */
export function createAuthMiddleware(
  jwtSecret?: string
): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
  const auth = new AuthMiddleware(jwtSecret);
  return auth.authenticate;
}
