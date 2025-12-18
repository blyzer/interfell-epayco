/**
 * PostgresTransactionRepository - Infrastructure Layer
 * 
 * Implementación concreta del repositorio de transacciones usando PostgreSQL.
 * 
 * Responsabilidades:
 * - Persistir transacciones en BD
 * - Recuperar transacciones por diferentes criterios
 * - Manejar idempotencia
 * - Mapeo: Entidades de dominio ↔ Registros SQL
 * 
 * Implementa la interfaz ITransactionRepository del dominio.
 * No tiene dependencias de dominio, pero sí de infrastructure (DB).
 */

import { Pool, QueryResult } from 'pg';
import { Transaction, TransactionStatus } from '../../domain/aggregates/transaction.aggregate';
import { TransactionId } from '../../domain/value-objects/transaction-id.vo';
import { Amount } from '../../domain/value-objects/amount.vo';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository';

export class PostgresTransactionRepository implements ITransactionRepository {
  constructor(private dbPool: Pool) {}

  /**
   * Guarda una transacción (CREATE o UPDATE)
   * Usa UPSERT para manejar reintentos
   */
  async save(transaction: Transaction): Promise<void> {
    const query = `
      INSERT INTO transactions (
        id,
        user_id,
        merchant_id,
        amount,
        currency,
        status,
        idempotency_key,
        fraud_score,
        bank_reference_id,
        failure_reason,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        fraud_score = EXCLUDED.fraud_score,
        bank_reference_id = EXCLUDED.bank_reference_id,
        failure_reason = EXCLUDED.failure_reason,
        updated_at = EXCLUDED.updated_at
      RETURNING id;
    `;

    const values = [
      transaction.getId().getValue(),
      transaction.getUserId(),
      transaction.getMerchantId(),
      transaction.getAmount().getValue(),
      transaction.getAmount().getCurrency(),
      transaction.getStatus(),
      transaction.getIdempotencyKey(),
      transaction.getFraudScore() || null,
      transaction.getBankReferenceId() || null,
      null, // failureReason TODO: agregar al aggregate
      new Date(),
      new Date()
    ];

    try {
      await this.dbPool.query(query, values);
      console.log(
        `[Repository] Transacción guardada: ${transaction.getId().getValue()}`
      );
    } catch (error) {
      console.error('[Repository] Error guardando transacción:', error);
      throw error;
    }
  }

  /**
   * Busca una transacción por ID
   */
  async findById(id: TransactionId): Promise<Transaction | null> {
    const query = `
      SELECT * FROM transactions
      WHERE id = $1
      LIMIT 1;
    `;

    try {
      const result = await this.dbPool.query(query, [id.getValue()]);
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTransaction(result.rows[0]);
    } catch (error) {
      console.error('[Repository] Error buscando por ID:', error);
      throw error;
    }
  }

  /**
   * Busca una transacción por idempotency key
   * Crítico para prevenir pagos duplicados
   */
  async findByIdempotencyKey(key: string): Promise<Transaction | null> {
    const query = `
      SELECT * FROM transactions
      WHERE idempotency_key = $1
      LIMIT 1;
    `;

    try {
      const result = await this.dbPool.query(query, [key]);
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToTransaction(result.rows[0]);
    } catch (error) {
      console.error('[Repository] Error buscando por idempotency key:', error);
      throw error;
    }
  }

  /**
   * Busca transacciones de un usuario
   */
  async findByUserId(userId: string): Promise<Transaction[]> {
    const query = `
      SELECT * FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100;
    `;

    try {
      const result = await this.dbPool.query(query, [userId]);
      return result.rows.map(row => this.mapRowToTransaction(row));
    } catch (error) {
      console.error('[Repository] Error buscando por usuario:', error);
      throw error;
    }
  }

  /**
   * Busca transacciones en un rango de fechas
   */
  async findByDateRange(from: Date, to: Date): Promise<Transaction[]> {
    const query = `
      SELECT * FROM transactions
      WHERE created_at BETWEEN $1 AND $2
      ORDER BY created_at DESC
      LIMIT 1000;
    `;

    try {
      const result = await this.dbPool.query(query, [from, to]);
      return result.rows.map(row => this.mapRowToTransaction(row));
    } catch (error) {
      console.error('[Repository] Error buscando por rango:', error);
      throw error;
    }
  }

  /**
   * Mapea una fila de BD a un objeto Transaction de dominio
   */
  private mapRowToTransaction(row: any): Transaction {
    const amount = Amount.create(row.amount, row.currency);

    // Reconstruir desde persistencia
    // TODO: Agregar método fromPersistence al aggregate
    return Transaction.fromPersistence({
      id: row.id,
      userId: row.user_id,
      merchantId: row.merchant_id,
      amount: row.amount,
      currency: row.currency,
      status: row.status as TransactionStatus,
      idempotencyKey: row.idempotency_key,
      fraudScore: row.fraud_score,
      bankReferenceId: row.bank_reference_id,
      failureReason: row.failure_reason,
      createdAt: row.created_at
    });
  }
}
