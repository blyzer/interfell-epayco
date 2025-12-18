/**
 * BankIntegrationClient - Infrastructure Layer
 * 
 * Cliente para integración con servicio bancario.
 * 
 * Responsabilidades:
 * - Procesar pagos en banco
 * - Revertir pagos (para compensación SAGA)
 * - Timeout handling (30s)
 * - Retry logic con exponential backoff
 * - Request ID para tracking distribuido
 * - Error mapping
 * 
 * Implementa IBankServiceClient del dominio.
 */

import axios, { AxiosInstance } from 'axios';

export interface BankPaymentResponse {
  bankReferenceId: string; // ID único del banco para esta transacción
  confirmed: boolean; // true si fue procesado exitosamente
  timestamp: string; // ISO timestamp
  details?: string;
}

export class BankIntegrationClient {
  private client: AxiosInstance;
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_BACKOFF_MS = 500; // 500ms, 1s, 2s
  private readonly TIMEOUT_MS = 30000; // 30 segundos
  private readonly apiKey: string;

  constructor(baseURL: string, apiKey: string) {
    this.apiKey = apiKey;

    this.client = axios.create({
      baseURL,
      timeout: this.TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      }
    });
  }

  /**
   * Procesa un pago en el banco
   * 
   * Devuelve bankReferenceId si fue exitoso.
   * Este ID es crítico para:
   * - Reconciliación
   * - Reversal (compensación)
   * - Auditoría
   * 
   * @param payload datos del pago
   * @returns BankPaymentResponse
   * @throws Error si falla después de reintentos
   */
  async processPayment(payload: {
    transactionId: string;
    walletId: string;
    amount: number;
    merchantId: string;
  }): Promise<BankPaymentResponse> {
    const requestId = `${payload.transactionId}-${Date.now()}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(
          `[BankClient] Intento ${attempt}/${this.RETRY_ATTEMPTS} - Processing payment`,
          `requestId=${requestId}`
        );

        const response = await this.client.post<BankPaymentResponse>(
          '/api/v1/payments/process',
          {
            transactionId: payload.transactionId,
            walletId: payload.walletId,
            amount: payload.amount,
            merchantId: payload.merchantId,
            requestId, // Para idempotencia en el banco
            timestamp: new Date().toISOString()
          }
        );

        console.log(
          `[BankClient] ✓ Payment processed successfully`,
          `bankRef=${response.data.bankReferenceId}`
        );
        return response.data;
      } catch (error) {
        lastError = error as Error;
        const errorMsg = (error as any).response?.data?.message || (error as any).message;

        console.warn(
          `[BankClient] ✗ Attempt ${attempt} failed:`,
          errorMsg
        );

        // Si es el último intento, no esperar
        if (attempt < this.RETRY_ATTEMPTS) {
          const backoffMs = this.RETRY_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.log(`[BankClient] Waiting ${backoffMs}ms before retry...`);
          await this.delay(backoffMs);
        }
      }
    }

    // Todos los reintentos fallaron
    console.error(
      `[BankClient] ✗ Payment processing failed after ${this.RETRY_ATTEMPTS} attempts`
    );
    throw new Error(
      `Bank service unavailable: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Revierte un pago (compensación SAGA)
   * 
   * Usado cuando el SAGA falla después de haber debitado.
   * Crítico para mantener consistencia.
   * 
   * @param bankReferenceId ID del banco obtenido en processPayment
   * @param reason razón de la reversión
   * @returns confirmación de reversión
   */
  async reversePayment(
    bankReferenceId: string,
    reason: string
  ): Promise<{ reversed: boolean; reversalId: string }> {
    const reversalRequestId = `reversal-${bankReferenceId}-${Date.now()}`;

    try {
      console.log(
        `[BankClient] Reversing payment`,
        `bankRef=${bankReferenceId}`,
        `reason=${reason}`
      );

      const response = await this.client.post(
        `/api/v1/payments/${bankReferenceId}/reverse`,
        {
          reason,
          reversalRequestId,
          timestamp: new Date().toISOString()
        }
      );

      console.log(
        `[BankClient] ✓ Payment reversed successfully`,
        `reversalId=${response.data.reversalId}`
      );

      return {
        reversed: true,
        reversalId: response.data.reversalId
      };
    } catch (error) {
      console.error('[BankClient] Error reversing payment:', error);
      // TODO: Implementar dead letter queue para reversales fallidas
      throw error;
    }
  }

  /**
   * Obtiene el estado actual de un pago en el banco
   */
  async getPaymentStatus(
    bankReferenceId: string
  ): Promise<{ status: string; amount: number; timestamp: string }> {
    try {
      const response = await this.client.get(
        `/api/v1/payments/${bankReferenceId}/status`
      );
      return response.data;
    } catch (error) {
      console.error('[BankClient] Error getting payment status:', error);
      throw error;
    }
  }

  /**
   * Reconcilia transacciones entre nuestro sistema y el banco
   * (operación no-crítica, para auditoría)
   */
  async reconcile(from: Date, to: Date): Promise<any> {
    try {
      console.log(
        `[BankClient] Reconciling transactions from ${from.toISOString()} to ${to.toISOString()}`
      );

      const response = await this.client.post('/api/v1/reconcile', {
        from: from.toISOString(),
        to: to.toISOString()
      });

      console.log('[BankClient] Reconciliation completed');
      return response.data;
    } catch (error) {
      console.error('[BankClient] Reconciliation failed:', error);
      // No lanzar error, es operación no-crítica
      return null;
    }
  }

  /**
   * Utilidad: delay para retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
