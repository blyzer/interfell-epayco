/**
 * FraudServiceClient - Infrastructure Layer
 * 
 * Cliente HTTP para comunicarse con el servicio de detección de fraude.
 * 
 * Responsabilidades:
 * - HTTP requests a Fraud Service
 * - Retry logic (3 intentos con exponential backoff)
 * - Timeout handling (30s)
 * - Error mapping y logging
 * 
 * Implementa IFraudServiceClient del dominio.
 */

import axios, { AxiosInstance } from 'axios';

export interface FraudCheckResponse {
  score: number; // 0-100 (0 = no fraud, 100 = definite fraud)
  approved: boolean; // true si score < 70
  riskLevel: string; // 'LOW', 'MEDIUM', 'HIGH'
  details?: string;
}

export class FraudServiceClient {
  private client: AxiosInstance;
  private readonly RETRY_ATTEMPTS = 3;
  private readonly RETRY_BACKOFF_MS = 1000; // 1s, 2s, 4s
  private readonly TIMEOUT_MS = 30000; // 30 segundos

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: this.TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Verifica si una transacción podría ser fraude
   * 
   * @param payload datos a verificar
   * @returns FraudCheckResponse con score y approved
   * @throws Error si falla después de reintentos
   */
  async checkFraud(payload: {
    transactionId: string;
    userId: string;
    amount: number;
    merchantId: string;
  }): Promise<FraudCheckResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(
          `[FraudClient] Intento ${attempt}/${this.RETRY_ATTEMPTS} para ${payload.transactionId}`
        );

        const response = await this.client.post<FraudCheckResponse>(
          '/api/v1/check',
          {
            transactionId: payload.transactionId,
            userId: payload.userId,
            amount: payload.amount,
            merchantId: payload.merchantId,
            timestamp: new Date().toISOString()
          }
        );

        console.log(
          `[FraudClient] ✓ Fraud check exitoso: score=${response.data.score}`
        );
        return response.data;
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `[FraudClient] ✗ Intento ${attempt} falló:`,
          (error as any).message
        );

        // Si es el último intento, no esperar
        if (attempt < this.RETRY_ATTEMPTS) {
          const backoffMs = this.RETRY_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.log(`[FraudClient] Esperando ${backoffMs}ms antes de reintentar...`);
          await this.delay(backoffMs);
        }
      }
    }

    // Todos los reintentos fallaron
    console.error(
      `[FraudClient] ✗ Fraud check falló después de ${this.RETRY_ATTEMPTS} intentos`
    );
    throw new Error(
      `Fraud Service no disponible: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Obtiene el histórico de fraude de un usuario
   */
  async getUserFraudHistory(userId: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/api/v1/users/${userId}/fraud-history`);
      return response.data || [];
    } catch (error) {
      console.error('[FraudClient] Error obteniendo histórico:', error);
      throw error;
    }
  }

  /**
   * Marca una transacción como fraude confirmado (para machine learning)
   */
  async reportFraud(transactionId: string, reason: string): Promise<void> {
    try {
      await this.client.post(`/api/v1/transactions/${transactionId}/report-fraud`, {
        reason,
        reportedAt: new Date().toISOString()
      });
      console.log(`[FraudClient] Fraude reportado: ${transactionId}`);
    } catch (error) {
      console.error('[FraudClient] Error reportando fraude:', error);
      // No lanzar error, es operación no-crítica
    }
  }

  /**
   * Utilidad: delay para retry backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
