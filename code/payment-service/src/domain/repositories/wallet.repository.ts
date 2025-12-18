/**
 * IWalletRepository - Domain Repository Interface
 * 
 * Contrato para operaciones de cartera de usuario.
 * Responsabilidades:
 * - Consultar balance
 * - Debitar (con tracking de transacción)
 * - Revertir débito (compensación SAGA)
 */

export interface WalletBalance {
  userId: string;
  balance: number;
  currency: string;
  lastUpdated: Date;
}

export interface IWalletRepository {
  /**
   * Obtiene el balance actual de un usuario
   */
  getBalance(userId: string): Promise<WalletBalance>;

  /**
   * Debita cantidad de la cartera
   * @param userId ID del usuario
   * @param amount cantidad a debitar
   * @param transactionId ID de transacción para auditoría
   */
  debit(userId: string, amount: number, transactionId: string): Promise<void>;

  /**
   * Revierte un débito anterior (compensación)
   * @param transactionId ID de transacción a revertir
   */
  reverse(transactionId: string): Promise<void>;

  /**
   * Acredita cantidad a la cartera (refund)
   */
  credit(userId: string, amount: number, reason: string): Promise<void>;
}
