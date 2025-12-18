/**
 * Get Transaction Query Handler - Retrieves transaction details by ID
 */

import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { createLogger } from '../../infrastructure/config/logging.config';
import { GetTransactionQuery } from '../queries/get-transaction.query';
import { PaymentStatusResponseDto, PaymentStatus } from '../../presentation/dtos/payment-response.dto';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';

const log = createLogger('GetTransactionHandler');

/**
 * Transaction repository interface
 */
export interface ITransactionRepository {
  findById(transactionId: string): Promise<any>;
  findByIdempotencyKey(key: string): Promise<any>;
  findByWalletId(walletId: string, limit?: number): Promise<any[]>;
}

/**
 * Get Transaction Query Handler
 * Handles retrieval of transaction details from database
 */
@Injectable()
@QueryHandler(GetTransactionQuery)
export class GetTransactionHandler implements IQueryHandler<GetTransactionQuery> {
  constructor(private transactionRepository: ITransactionRepository) {}

  /**
   * Execute query handler
   */
  async execute(query: GetTransactionQuery): Promise<PaymentStatusResponseDto> {
    try {
      log.debug('Executing GetTransactionQuery', {
        transactionId: query.transactionId,
        requestId: query.requestId,
      });

      const transaction = await this.transactionRepository.findById(query.transactionId);

      if (!transaction) {
        log.warn('Transaction not found', {
          transactionId: query.transactionId,
          requestId: query.requestId,
        });

        throw new NotFoundException({
          code: 'TRANSACTION_NOT_FOUND',
          message: `Transaction ${query.transactionId} not found`,
          details: {
            transactionId: query.transactionId,
          },
        });
      }

      const response = this.mapTransactionToResponse(transaction);

      log.info('Transaction retrieved successfully', {
        transactionId: query.transactionId,
        status: transaction.status,
        requestId: query.requestId,
      });

      return response;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      log.error('Failed to get transaction', {
        transactionId: query.transactionId,
        error,
        requestId: query.requestId,
      });

      throw new InternalServerErrorException({
        code: 'TRANSACTION_RETRIEVAL_FAILED',
        message: 'Failed to retrieve transaction',
        details: {
          transactionId: query.transactionId,
          error: (error as Error).message,
        },
      });
    }
  }

  /**
   * Map transaction entity to response DTO
   */
  private mapTransactionToResponse(transaction: any): PaymentStatusResponseDto {
    return new PaymentStatusResponseDto({
      transactionId: transaction.id,
      idempotencyKey: transaction.idempotencyKey,
      status: this.mapStatus(transaction.status),
      amount: transaction.amount,
      currency: transaction.currency,
      createdAt: new Date(transaction.createdAt),
      completedAt: transaction.completedAt ? new Date(transaction.completedAt) : undefined,
      reason: transaction.failureReason,
    });
  }

  /**
   * Map database status to PaymentStatus enum
   */
  private mapStatus(dbStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'pending': PaymentStatus.PENDING,
      'processing': PaymentStatus.PROCESSING,
      'completed': PaymentStatus.COMPLETED,
      'failed': PaymentStatus.FAILED,
      'reversed': PaymentStatus.REVERSED,
      'cancelled': PaymentStatus.CANCELLED,
    };

    return statusMap[dbStatus.toLowerCase()] || PaymentStatus.PENDING;
  }
}

/**
 * Batch Get Transactions Handler - Retrieves multiple transactions
 */
@Injectable()
@QueryHandler(GetTransactionQuery)
export class GetTransactionsByWalletHandler implements IQueryHandler<GetTransactionQuery> {
  constructor(private transactionRepository: ITransactionRepository) {}

  /**
   * Execute query handler for batch retrieval
   */
  async execute(query: GetTransactionQuery & { walletId?: string; limit?: number }): Promise<PaymentStatusResponseDto[]> {
    try {
      if (!query.walletId) {
        throw new Error('Wallet ID is required for batch retrieval');
      }

      log.debug('Executing GetTransactionsByWalletQuery', {
        walletId: query.walletId,
        limit: query.limit || 50,
        requestId: query.requestId,
      });

      const transactions = await this.transactionRepository.findByWalletId(
        query.walletId,
        query.limit || 50,
      );

      if (!transactions || transactions.length === 0) {
        log.info('No transactions found for wallet', {
          walletId: query.walletId,
          requestId: query.requestId,
        });

        return [];
      }

      const responses = transactions.map(t => this.mapTransactionToResponse(t));

      log.info('Transactions retrieved successfully', {
        walletId: query.walletId,
        count: responses.length,
        requestId: query.requestId,
      });

      return responses;
    } catch (error) {
      log.error('Failed to get transactions by wallet', {
        walletId: (query as any).walletId,
        error,
        requestId: query.requestId,
      });

      throw new InternalServerErrorException({
        code: 'TRANSACTIONS_RETRIEVAL_FAILED',
        message: 'Failed to retrieve transactions',
      });
    }
  }

  /**
   * Map transaction entity to response DTO
   */
  private mapTransactionToResponse(transaction: any): PaymentStatusResponseDto {
    return new PaymentStatusResponseDto({
      transactionId: transaction.id,
      idempotencyKey: transaction.idempotencyKey,
      status: this.mapStatus(transaction.status),
      amount: transaction.amount,
      currency: transaction.currency,
      createdAt: new Date(transaction.createdAt),
      completedAt: transaction.completedAt ? new Date(transaction.completedAt) : undefined,
      reason: transaction.failureReason,
    });
  }

  /**
   * Map database status to PaymentStatus enum
   */
  private mapStatus(dbStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'pending': PaymentStatus.PENDING,
      'processing': PaymentStatus.PROCESSING,
      'completed': PaymentStatus.COMPLETED,
      'failed': PaymentStatus.FAILED,
      'reversed': PaymentStatus.REVERSED,
      'cancelled': PaymentStatus.CANCELLED,
    };

    return statusMap[dbStatus.toLowerCase()] || PaymentStatus.PENDING;
  }
}

/**
 * Get Transaction by Idempotency Key Handler
 */
@Injectable()
export class GetTransactionByIdempotencyKeyHandler {
  constructor(private transactionRepository: ITransactionRepository) {}

  /**
   * Execute query handler
   */
  async execute(idempotencyKey: string, requestId?: string): Promise<PaymentStatusResponseDto> {
    try {
      log.debug('Executing GetTransactionByIdempotencyKey', {
        idempotencyKey,
        requestId,
      });

      const transaction = await this.transactionRepository.findByIdempotencyKey(idempotencyKey);

      if (!transaction) {
        log.warn('Transaction not found by idempotency key', {
          idempotencyKey,
          requestId,
        });

        throw new NotFoundException({
          code: 'TRANSACTION_NOT_FOUND',
          message: `Transaction with idempotency key ${idempotencyKey} not found`,
        });
      }

      const response = this.mapTransactionToResponse(transaction);

      log.info('Transaction retrieved by idempotency key', {
        idempotencyKey,
        transactionId: transaction.id,
        requestId,
      });

      return response;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      log.error('Failed to get transaction by idempotency key', {
        idempotencyKey,
        error,
        requestId,
      });

      throw new InternalServerErrorException({
        code: 'TRANSACTION_RETRIEVAL_FAILED',
        message: 'Failed to retrieve transaction',
      });
    }
  }

  /**
   * Map transaction entity to response DTO
   */
  private mapTransactionToResponse(transaction: any): PaymentStatusResponseDto {
    return new PaymentStatusResponseDto({
      transactionId: transaction.id,
      idempotencyKey: transaction.idempotencyKey,
      status: this.mapStatus(transaction.status),
      amount: transaction.amount,
      currency: transaction.currency,
      createdAt: new Date(transaction.createdAt),
      completedAt: transaction.completedAt ? new Date(transaction.completedAt) : undefined,
      reason: transaction.failureReason,
    });
  }

  /**
   * Map database status to PaymentStatus enum
   */
  private mapStatus(dbStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      'pending': PaymentStatus.PENDING,
      'processing': PaymentStatus.PROCESSING,
      'completed': PaymentStatus.COMPLETED,
      'failed': PaymentStatus.FAILED,
      'reversed': PaymentStatus.REVERSED,
      'cancelled': PaymentStatus.CANCELLED,
    };

    return statusMap[dbStatus.toLowerCase()] || PaymentStatus.PENDING;
  }
}
