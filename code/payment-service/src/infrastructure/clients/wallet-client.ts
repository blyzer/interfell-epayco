/**
 * Wallet Client - HTTP integration with external wallet service
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Wallet response from external service
 */
export interface WalletResponse {
  walletId: string;
  userId: string;
  balance: number;
  lockedBalance: number;
  currency: string;
  status: 'ACTIVE' | 'LOCKED' | 'SUSPENDED';
}

/**
 * Request to debit wallet
 */
export interface DebitRequest {
  walletId: string;
  amount: number;
  transactionId: string;
  idempotencyKey: string;
  reason?: string;
}

/**
 * Request to credit wallet
 */
export interface CreditRequest {
  walletId: string;
  amount: number;
  transactionId: string;
  reason: string;
}

/**
 * Request to lock balance
 */
export interface LockBalanceRequest {
  walletId: string;
  amount: number;
  transactionId: string;
  expiresIn?: number;
}

/**
 * Error response from wallet service
 */
export interface WalletErrorResponse {
  code: string;
  message: string;
  details?: any;
}

/**
 * Wallet Client
 * Handles HTTP communication with external Wallet Service
 */
export class WalletClient {
  private httpClient: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.httpClient = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'payment-service/1.0',
      },
      timeout: 10000,
      validateStatus: () => true,
    });
  }

  /**
   * Get wallet details
   */
  async getWallet(walletId: string): Promise<WalletResponse> {
    try {
      const response = await this.httpClient.get<WalletResponse>(`/wallets/${walletId}`);

      if (response.status !== 200) {
        throw this.handleError(response.status, response.data);
      }

      return response.data;
    } catch (error) {
      throw this.wrapError('WALLET_FETCH_FAILED', error as Error);
    }
  }

  /**
   * Debit amount from wallet
   */
  async debitWallet(request: DebitRequest): Promise<WalletResponse> {
    try {
      const response = await this.httpClient.post<WalletResponse>(
        `/wallets/${request.walletId}/debit`,
        {
          amount: request.amount,
          transactionId: request.transactionId,
          idempotencyKey: request.idempotencyKey,
          reason: request.reason || 'PAYMENT',
        },
      );

      if (response.status !== 200) {
        throw this.handleError(response.status, response.data);
      }

      return response.data;
    } catch (error) {
      throw this.wrapError('WALLET_DEBIT_FAILED', error as Error);
    }
  }

  /**
   * Credit amount to wallet
   */
  async creditWallet(request: CreditRequest): Promise<WalletResponse> {
    try {
      const response = await this.httpClient.post<WalletResponse>(
        `/wallets/${request.walletId}/credit`,
        {
          amount: request.amount,
          transactionId: request.transactionId,
          reason: request.reason,
        },
      );

      if (response.status !== 200) {
        throw this.handleError(response.status, response.data);
      }

      return response.data;
    } catch (error) {
      throw this.wrapError('WALLET_CREDIT_FAILED', error as Error);
    }
  }

  /**
   * Lock balance for pending transaction
   */
  async lockBalance(request: LockBalanceRequest): Promise<WalletResponse> {
    try {
      const response = await this.httpClient.post<WalletResponse>(
        `/wallets/${request.walletId}/lock`,
        {
          amount: request.amount,
          transactionId: request.transactionId,
          expiresIn: request.expiresIn || 3600,
        },
      );

      if (response.status !== 200) {
        throw this.handleError(response.status, response.data);
      }

      return response.data;
    } catch (error) {
      throw this.wrapError('WALLET_LOCK_FAILED', error as Error);
    }
  }

  /**
   * Unlock previously locked balance
   */
  async unlockBalance(
    walletId: string,
    amount: number,
    transactionId: string,
  ): Promise<WalletResponse> {
    try {
      const response = await this.httpClient.post<WalletResponse>(
        `/wallets/${walletId}/unlock`,
        {
          amount,
          transactionId,
        },
      );

      if (response.status !== 200) {
        throw this.handleError(response.status, response.data);
      }

      return response.data;
    } catch (error) {
      throw this.wrapError('WALLET_UNLOCK_FAILED', error as Error);
    }
  }

  /**
   * Check if balance is available
   */
  async checkBalanceAvailable(walletId: string, amount: number): Promise<boolean> {
    try {
      const wallet = await this.getWallet(walletId);
      const available = wallet.balance - wallet.lockedBalance;
      return available >= amount;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Health check for wallet service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Handle HTTP errors
   */
  private handleError(status: number, data: any): Error {
    const errorData = data as WalletErrorResponse;

    switch (status) {
      case 400:
        return new Error(`Bad request: ${errorData.message}`);
      case 401:
        return new Error('Unauthorized - Invalid API key');
      case 403:
        return new Error('Forbidden - Access denied');
      case 404:
        return new Error(`Not found: ${errorData.message}`);
      case 409:
        return new Error(`Conflict: ${errorData.message}`);
      case 429:
        return new Error('Rate limited - Too many requests');
      case 500:
        return new Error(`Server error: ${errorData.message}`);
      case 503:
        return new Error('Service unavailable');
      default:
        return new Error(`HTTP ${status}: ${errorData.message}`);
    }
  }

  /**
   * Wrap error with context
   */
  private wrapError(code: string, error: Error): Error {
    return new Error(`[${code}] ${error.message}`);
  }

  /**
   * Get base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}