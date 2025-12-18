/**
 * ITransactionRepository - Domain Repository Interface
 * 
 * Contrato que define cómo persistir transacciones.
 * El dominio NO conoce PostgreSQL, MongoDB, etc.
 * Solo conoce esta interfaz.
 * 
 * La implementación concreta está en infrastructure/
 */

import { Transaction } from '../aggregates/transaction.aggregate';
import { TransactionId } from '../value-objects/transaction-id.vo';

export interface ITransactionRepository {
  /**
   * Guarda una transacción (CREATE o UPDATE)
   */
  save(transaction: Transaction): Promise<void>;

  /**
   * Busca por ID
   */
  findById(id: TransactionId): Promise<Transaction | null>;

  /**
   * Busca por idempotency key (crítico para prevenir duplicados)
   */
  findByIdempotencyKey(key: string): Promise<Transaction | null>;

  /**
   * Busca todas las transacciones de un usuario
   */
  findByUserId(userId: string): Promise<Transaction[]>;

  /**
   * Busca transacciones en un rango de fechas
   */
  findByDateRange(from: Date, to: Date): Promise<Transaction[]>;
}
