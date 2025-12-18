/**
 * PostgresWalletRepository - Implementation
 * 
 * Implementación concreta del repositorio de cartera.
 * Maneja débitos, créditos, reversiones con transacciones ACID.
 */

import { Pool } from 'pg';
import { IWalletRepository, WalletBalance } from '../../domain/repositories/wallet.repository';

export class PostgresWalletRepository implements IWalletRepository {
  constructor(private dbPool: Pool) {}

  /**
   * Obtiene el balance actual de un usuario
   */
  async getBalance(userId: string): Promise<WalletBalance> {
    const query = `
      SELECT 
        user_id,
        balance,
        currency,
        last_updated
      FROM wallets
      WHERE user_id = $1
      FOR UPDATE; -- Lock para evitar race conditions
    `;

    try {
      const result = await this.dbPool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        // Usuario sin cartera - crear con balance 0
        await this.createWallet(userId);
        return {
          userId,
          balance: 0,
          currency: 'COP',
          lastUpdated: new Date()
        };
      }

      return {
        userId: result.rows[0].user_id,
        balance: parseFloat(result.rows[0].balance),
        currency: result.rows[0].currency,
        lastUpdated: result.rows[0].last_updated
      };
    } catch (error) {
      console.error('[WalletRepository] Error obtener balance:', error);
      throw error;
    }
  }

  /**
   * Debita cantidad de la cartera
   * Usa transacción para garantizar atomicidad
   */
  async debit(
    userId: string,
    amount: number,
    transactionId: string
  ): Promise<void> {
    const client = await this.dbPool.connect();

    try {
      await client.query('BEGIN');

      // Obtener balance actual (con lock)
      const balanceResult = await client.query(
        `SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`,
        [userId]
      );

      if (balanceResult.rows.length === 0) {
        throw new Error(`Cartera no encontrada para usuario: ${userId}`);
      }

      const currentBalance = parseFloat(balanceResult.rows[0].balance);

      if (currentBalance < amount) {
        await client.query('ROLLBACK');
        throw new Error(
          `Fondos insuficientes: ${currentBalance} < ${amount}`
        );
      }

      // Realizar débito
      const newBalance = currentBalance - amount;
      await client.query(
        `UPDATE wallets SET balance = $1, last_updated = NOW() 
         WHERE user_id = $2`,
        [newBalance, userId]
      );

      // Registrar movimiento
      await client.query(
        `INSERT INTO wallet_movements 
         (transaction_id, user_id, amount, movement_type, balance_after, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          transactionId,
          userId,
          amount,
          'DEBIT',
          newBalance,
          'Débito para transacción de pago'
        ]
      );

      await client.query('COMMIT');
      console.log(
        `[WalletRepository] ✓ Débito completado: ${userId} - ${amount}`
      );
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[WalletRepository] Error debitando:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Revierte un débito anterior (compensación SAGA)
   * Busca el débito original y lo revierte
   */
  async reverse(transactionId: string): Promise<void> {
    const client = await this.dbPool.connect();

    try {
      await client.query('BEGIN');

      // Buscar movimiento original
      const movementResult = await client.query(
        `SELECT * FROM wallet_movements 
         WHERE transaction_id = $1 AND movement_type = 'DEBIT'
         LIMIT 1`,
        [transactionId]
      );

      if (movementResult.rows.length === 0) {
        throw new Error(`No se encontró débito para reversar: ${transactionId}`);
      }

      const movement = movementResult.rows[0];
      const { user_id: userId, amount } = movement;

      // Aumentar balance
      await client.query(
        `UPDATE wallets SET balance = balance + $1, last_updated = NOW()
         WHERE user_id = $2`,
        [amount, userId]
      );

      // Registrar reversión
      await client.query(
        `INSERT INTO wallet_movements 
         (transaction_id, user_id, amount, movement_type, balance_after, reason, created_at)
         VALUES ($1, $2, $3, $4, 
           (SELECT balance FROM wallets WHERE user_id = $2), 
           $5, NOW())`,
        [
          transactionId,
          userId,
          amount,
          'REVERSAL',
          'Reversión de débito - SAGA compensation'
        ]
      );

      await client.query('COMMIT');
      console.log(
        `[WalletRepository] ✓ Débito revertido: ${transactionId}`
      );
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[WalletRepository] Error revirtiendo:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Acredita cantidad a la cartera (refund/devolución)
   */
  async credit(userId: string, amount: number, reason: string): Promise<void> {
    const query = `
      UPDATE wallets 
      SET balance = balance + $1, last_updated = NOW()
      WHERE user_id = $2;
      
      INSERT INTO wallet_movements 
      (user_id, amount, movement_type, balance_after, reason, created_at)
      VALUES ($2, $1, 'CREDIT', 
        (SELECT balance FROM wallets WHERE user_id = $2),
        $3, NOW());
    `;

    try {
      await this.dbPool.query(query, [amount, userId, reason]);
      console.log(`[WalletRepository] ✓ Crédito completado: ${userId} + ${amount}`);
    } catch (error) {
      console.error('[WalletRepository] Error creditando:', error);
      throw error;
    }
  }

  /**
   * Crear cartera inicial para un usuario
   */
  private async createWallet(userId: string): Promise<void> {
    const query = `
      INSERT INTO wallets (user_id, balance, currency, last_updated)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id) DO NOTHING;
    `;

    try {
      await this.dbPool.query(query, [userId, 0, 'COP']);
    } catch (error) {
      console.error('[WalletRepository] Error creando cartera:', error);
      throw error;
    }
  }
}
