// IdempotencyChecker
/**
 * Idempotency Checker Service - Evita el procesamiento de pagos duplicados
 */

import { IIdempotencyRepository } from '../repositories/idempotency.repository';
import { TransactionId } from '../aggregates/transaction-id.vo';

/**
 * Idempotency Record Interface
 * Almacena el estado de la transacción codificado por la clave de idempotencia
 */
export interface IdempotencyRecord {
  idempotencyKey: string;
  transactionId: TransactionId;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  result?: any;
  error?: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Idempotency Checker Service
 * Garantiza que las solicitudes de pago se procesen solo una vez
 * Utiliza TTL de 24 horas para limpieza automática
 */
export class IdempotencyCheckerService {
  private readonly ttlSeconds = 86400; // 24 hours

  constructor(private idempotencyRepository: IIdempotencyRepository) {}

  /**
   * Compruebe si la clave de idempotencia existe y sigue siendo válida
   * Devuelve nulo si no se encuentra o ha caducado
   */
  async checkIdempotencyKey(idempotencyKey: string): Promise<IdempotencyRecord | null> {
    try {
      const record = await this.idempotencyRepository.findByKey(idempotencyKey);

      if (!record) {
        return null;
      }

      // Check if record has expired
      if (new Date() > record.expiresAt) {
        await this.idempotencyRepository.delete(idempotencyKey);
        return null;
      }

      return record;
    } catch (error) {
      throw new Error(`Failed to check idempotency key: ${(error as Error).message}`);
    }
  }

  /**
   * Registrar nueva transacción con estado PENDIENTE
   * Establece el tiempo de vencimiento en 24 horas a partir de ahora
   */
  async recordTransaction(
    idempotencyKey: string,
    transactionId: TransactionId,
    status: 'PENDING' | 'COMPLETED' | 'FAILED',
    result?: any,
    error?: string,
  ): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.ttlSeconds * 1000);

      const record: IdempotencyRecord = {
        idempotencyKey,
        transactionId,
        status,
        result,
        error,
        createdAt: now,
        expiresAt,
      };

      await this.idempotencyRepository.save(record);
    } catch (error) {
      throw new Error(`Failed to record transaction: ${(error as Error).message}`);
    }
  }

  /**
   * Actualizar el estado de la transacción a COMPLETADO o FALLADO
   * Almacena el resultado o mensaje de error
   */
  async updateTransactionStatus(
    idempotencyKey: string,
    status: 'COMPLETED' | 'FAILED',
    result?: any,
    error?: string,
  ): Promise<void> {
    try {
      const record = await this.idempotencyRepository.findByKey(idempotencyKey);

      if (!record) {
        throw new Error(`Idempotency record not found: ${idempotencyKey}`);
      }

      const updatedRecord: IdempotencyRecord = {
        ...record,
        status,
        result,
        error,
      };

      await this.idempotencyRepository.save(updatedRecord);
    } catch (error) {
      throw new Error(`Failed to update transaction status: ${(error as Error).message}`);
    }
  }

  /**
   * Obtener el resultado de la transacción existente si ya se procesó
   * Útil para escenarios de repetición
   */
  async getTransactionResult(idempotencyKey: string): Promise<any> {
    try {
      const record = await this.checkIdempotencyKey(idempotencyKey);

      if (!record) {
        return null;
      }

      if (record.status === 'PENDING') {
        throw new Error('Transaction still processing');
      }

      if (record.status === 'FAILED') {
        throw new Error(`Transaction failed: ${record.error}`);
      }

      return record.result;
    } catch (error) {
      throw new Error(`Failed to get transaction result: ${(error as Error).message}`);
    }
  }

  /**
   * Eliminar registros caducados con más de días especificados
   * Devuelve el recuento de registros eliminados
   */
  async cleanup(expirationDays: number = 1): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - expirationDays * 24 * 60 * 60 * 1000);
      const deletedCount = await this.idempotencyRepository.deleteExpired(cutoffDate);
      return deletedCount;
    } catch (error) {
      throw new Error(`Failed to cleanup expired records: ${(error as Error).message}`);
    }
  }

  /**
   * Compruebe si la transacción está actualmente en curso
   */
  async isTransactionInProgress(idempotencyKey: string): Promise<boolean> {
    try {
      const record = await this.checkIdempotencyKey(idempotencyKey);
      return record?.status === 'PENDING' || false;
    } catch (error) {
      throw new Error(`Failed to check transaction progress: ${(error as Error).message}`);
    }
  }

  /**
   * Marcar la transacción como completada después de un procesamiento exitoso
   */
  async markTransactionCompleted(
    idempotencyKey: string,
    result: any,
  ): Promise<void> {
    await this.updateTransactionStatus(idempotencyKey, 'COMPLETED', result, undefined);
  }

  /**
   * Marcar transacción como fallida después de un error
   */
  async markTransactionFailed(
    idempotencyKey: string,
    error: string,
  ): Promise<void> {
    await this.updateTransactionStatus(idempotencyKey, 'FAILED', undefined, error);
  }

  /**
   * Get TTL in seconds
   */
  getTtlSeconds(): number {
    return this.ttlSeconds;
  }

  /**
   * Get TTL in hours
   */
  getTtlHours(): number {
    return this.ttlSeconds / 3600;
  }
}