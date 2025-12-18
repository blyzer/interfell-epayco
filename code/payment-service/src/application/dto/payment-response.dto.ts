/**
 * Payment Response DTO - Data Transfer Object for payment responses
 */

import { IsString, IsNumber, IsEnum, IsOptional, IsDate, IsArray } from 'class-validator';

/**
 * Payment status enum
 */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
  CANCELLED = 'CANCELLED',
}

/**
 * Payment method enum
 */
export enum PaymentMethod {
  WALLET = 'WALLET',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
}

/**
 * Transaction details response
 */
export interface TransactionDetails {
  transactionId: string;
  idempotencyKey: string;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * Wallet information response
 */
export interface WalletInfo {
  walletId: string;
  balance: number;
  lockedBalance: number;
  availableBalance: number;
  currency: string;
}

/**
 * Error details in response
 */
export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

/**
 * Payment Response DTO
 * Successful payment response
 */
export class PaymentResponseDto {
  @IsString()
  transactionId: string;

  @IsString()
  idempotencyKey: string;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsNumber()
  @IsOptional()
  fee?: number;

  @IsNumber()
  @IsOptional()
  netAmount?: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  sourceWalletId?: string;

  @IsString()
  @IsOptional()
  destinationWalletId?: string;

  @IsDate()
  createdAt: Date;

  @IsDate()
  @IsOptional()
  completedAt?: Date;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  description?: string;

  constructor( Partial<PaymentResponseDto>) {
    Object.assign(this, data);
  }
}

/**
 * Batch Payment Response DTO
 * Response for batch payment processing
 */
export class BatchPaymentResponseDto {
  @IsString()
  batchId: string;

  @IsNumber()
  totalRequests: number;

  @IsNumber()
  successfulPayments: number;

  @IsNumber()
  failedPayments: number;

  @IsNumber()
  pendingPayments: number;

  @IsNumber()
  totalAmount: number;

  @IsString()
  currency: string;

  @IsDate()
  createdAt: Date;

  @IsDate()
  @IsOptional()
  completedAt?: Date;

  @IsArray()
  @IsOptional()
  payments?: PaymentResponseDto[];

  @IsArray()
  @IsOptional()
  failures?: Array<{
    transactionId: string;
    error: ErrorDetails;
  }>;

  constructor( Partial<BatchPaymentResponseDto>) {
    Object.assign(this, data);
  }
}

/**
 * Payment Status Check Response DTO
 */
export class PaymentStatusResponseDto {
  @IsString()
  transactionId: string;

  @IsString()
  idempotencyKey: string;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsDate()
  createdAt: Date;

  @IsDate()
  @IsOptional()
  completedAt?: Date;

  @IsString()
  @IsOptional()
  reason?: string;

  constructor( Partial<PaymentStatusResponseDto>) {
    Object.assign(this, data);
  }
}

/**
 * Payment Reversal Response DTO
 */
export class PaymentReversalResponseDto {
  @IsString()
  originalTransactionId: string;

  @IsString()
  reversalTransactionId: string;

  @IsNumber()
  reversedAmount: number;

  @IsString()
  currency: string;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsDate()
  createdAt: Date;

  @IsDate()
  @IsOptional()
  completedAt?: Date;

  @IsString()
  @IsOptional()
  reason?: string;

  constructor( Partial<PaymentReversalResponseDto>) {
    Object.assign(this, data);
  }
}

/**
 * Wallet Balance Response DTO
 */
export class WalletBalanceResponseDto {
  @IsString()
  walletId: string;

  @IsNumber()
  balance: number;

  @IsNumber()
  lockedBalance: number;

  @IsNumber()
  availableBalance: number;

  @IsString()
  currency: string;

  @IsDate()
  lastUpdated: Date;

  constructor( Partial<WalletBalanceResponseDto>) {
    Object.assign(this, data);
  }
}

/**
 * Transaction History Response DTO
 */
export class TransactionHistoryResponseDto {
  @IsString()
  walletId: string;

  @IsNumber()
  totalTransactions: number;

  @IsNumber()
  totalAmount: number;

  @IsString()
  currency: string;

  @IsDate()
  periodStart: Date;

  @IsDate()
  periodEnd: Date;

  @IsArray()
  transactions: TransactionDetails[];

  constructor( Partial<TransactionHistoryResponseDto>) {
    Object.assign(this, data);
  }
}

/**
 * Error Response DTO
 */
export class ErrorResponseDto {
  statusCode: number;
  code: string;
  message: string;
  timestamp: Date;
  requestId?: string;
  details?: any;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    requestId?: string,
    details?: any,
  ) {
    this.statusCode = statusCode;
    this.code = code;
    this.message = message;
    this.timestamp = new Date();
    this.requestId = requestId;
    this.details = details;
  }
}

/**
 * Success Response DTO - Generic wrapper for successful responses
 */
export class SuccessResponseDto<T> {
  statusCode: number = 200;
  code: string;
  message: string;
   T;
  timestamp: Date;
  requestId?: string;

  constructor(code: string, message: string,  T, requestId?: string) {
    this.code = code;
    this.message = message;
    this.data = data;
    this.timestamp = new Date();
    this.requestId = requestId;
  }
}
