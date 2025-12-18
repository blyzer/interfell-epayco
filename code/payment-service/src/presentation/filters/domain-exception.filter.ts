/**
 * Domain Exception Filter - Centralized error handling for NestJS
 */

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Custom domain exceptions
 */
export class InsufficientBalanceException extends Error {
  constructor(message: string = 'Insufficient balance') {
    super(message);
    this.name = 'InsufficientBalanceException';
  }
}

export class WalletNotFoundException extends Error {
  constructor(walletId: string) {
    super(`Wallet not found: ${walletId}`);
    this.name = 'WalletNotFoundException';
  }
}

export class InvalidAmountException extends Error {
  constructor(amount: number) {
    super(`Invalid amount: ${amount}`);
    this.name = 'InvalidAmountException';
  }
}

export class DuplicateTransactionException extends Error {
  constructor(idempotencyKey: string) {
    super(`Duplicate transaction: ${idempotencyKey}`);
    this.name = 'DuplicateTransactionException';
  }
}

export class TransactionProcessingException extends Error {
  constructor(message: string = 'Transaction processing failed') {
    super(message);
    this.name = 'TransactionProcessingException';
  }
}

export class ExternalServiceException extends Error {
  constructor(service: string, message: string) {
    super(`${service} service error: ${message}`);
    this.name = 'ExternalServiceException';
  }
}

export class IdempotencyKeyExpiredException extends Error {
  constructor(idempotencyKey: string) {
    super(`Idempotency key expired: ${idempotencyKey}`);
    this.name = 'IdempotencyKeyExpiredException';
  }
}

export class InvalidRequestException extends Error {
  constructor(message: string = 'Invalid request') {
    super(message);
    this.name = 'InvalidRequestException';
  }
}

export class UnauthorizedException extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedException';
  }
}

/**
 * Exception response interface
 */
export interface ExceptionResponse {
  statusCode: number;
  code: string;
  message: string;
  timestamp: string;
  requestId?: string;
  details?: any;
}

/**
 * Domain Exception Filter
 * Handles all exceptions and returns standardized error responses
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('DomainExceptionFilter');

  catch(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.headers['x-request-id'] as string;

    let statusCode: number;
    let code: string;
    let message: string;
    let details: any = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;

      code = exceptionResponse.code || 'HTTP_EXCEPTION';
      message = exceptionResponse.message || exception.message;
      details = exceptionResponse.details;
    } else if (exception instanceof InsufficientBalanceException) {
      statusCode = HttpStatus.BAD_REQUEST;
      code = 'INSUFFICIENT_BALANCE';
      message = exception.message;
    } else if (exception instanceof WalletNotFoundException) {
      statusCode = HttpStatus.NOT_FOUND;
      code = 'WALLET_NOT_FOUND';
      message = exception.message;
    } else if (exception instanceof InvalidAmountException) {
      statusCode = HttpStatus.BAD_REQUEST;
      code = 'INVALID_AMOUNT';
      message = exception.message;
    } else if (exception instanceof DuplicateTransactionException) {
      statusCode = HttpStatus.CONFLICT;
      code = 'DUPLICATE_TRANSACTION';
      message = exception.message;
    } else if (exception instanceof TransactionProcessingException) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'TRANSACTION_FAILED';
      message = exception.message;
    } else if (exception instanceof ExternalServiceException) {
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      code = 'EXTERNAL_SERVICE_ERROR';
      message = exception.message;
    } else if (exception instanceof IdempotencyKeyExpiredException) {
      statusCode = HttpStatus.GONE;
      code = 'IDEMPOTENCY_KEY_EXPIRED';
      message = exception.message;
    } else if (exception instanceof InvalidRequestException) {
      statusCode = HttpStatus.BAD_REQUEST;
      code = 'INVALID_REQUEST';
      message = exception.message;
    } else if (exception instanceof UnauthorizedException) {
      statusCode = HttpStatus.UNAUTHORIZED;
      code = 'UNAUTHORIZED';
      message = exception.message;
    } else if (exception instanceof Error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      code = exception.name || 'INTERNAL_ERROR';
      message = exception.message;

      this.logger.error(`Unhandled exception: ${exception.message}`, {
        stack: exception.stack,
        requestId,
      });
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'UNKNOWN_ERROR';
      message = 'An unexpected error occurred';

      this.logger.error('Unknown exception type', {
        exception,
        requestId,
      });
    }

    const exceptionResponse: ExceptionResponse = {
      statusCode,
      code,
      message,
      timestamp: new Date().toISOString(),
      requestId,
      ...(details && { details }),
    };

    this.logger.warn(`${request.method} ${request.path} - ${statusCode}`, {
      code,
      message,
      requestId,
    });

    response.status(statusCode).json(exceptionResponse);
  }
}