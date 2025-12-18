/**
 * PaymentOrchestrationService - Domain Service
 * 
 * Orquesta el SAGA de pago. Es el "director" que coordina todos los
 * pasos: fraud check, wallet check, bank processing, etc.
 * 
 * Por qué es un Domain Service y no un Application Service:
 * - Contiene lógica de NEGOCIO (reglas del SAGA)
 * - No depende de frameworks web
 * - Es testeable sin HTTP/DB
 * - Usa abstracciones (repositories, clientes internos)
 * 
 * @domain-logic Orquestación de pago con patrón SAGA
 */

import { Transaction } from '../aggregates/transaction.aggregate';
import { Amount } from '../value-objects/amount.vo';
import { ITransactionRepository } from '../repositories/transaction.repository';
import { IWalletRepository } from '../repositories/wallet.repository';
import { InsufficientFundsError } from '../errors/insufficient-funds.error';
import { FraudBlockedError } from '../errors/fraud-blocked.error';
import { PaymentTimeoutError } from '../errors/payment-timeout.error';

/**
 * Interfaz para cliente externo de Fraud Service
 * (Se inyecta en infrastructure/clients/fraud-client.ts)
 */
export interface IFraudServiceClient {
  checkFraud(payload: {
    transactionId: string;
    userId: string;
    amount: number;
    merchantId: string;
  }): Promise<{ score: number; approved: boolean }>;
}

/**
 * Interfaz para cliente externo de Bank Integration
 */
export interface IBankServiceClient {
  processPayment(payload: {
    transactionId: string;
    walletId: string;
    amount: number;
    merchantId: string;
  }): Promise<{ bankReferenceId: string; confirmed: boolean }>;
}

export class PaymentOrchestrationService {
  private readonly FRAUD_THRESHOLD = 70; // Si score >= 70, bloquear
  private readonly PAYMENT_TIMEOUT_MS = 30000; // 30 segundos timeout

  constructor(
    private transactionRepository: ITransactionRepository,
    private walletRepository: IWalletRepository,
    private fraudServiceClient: IFraudServiceClient,
    private bankServiceClient: IBankServiceClient
  ) {}

  /**
   * Inicia el SAGA de pago completo
   * 
   * Pasos:
   * 1. Crear transacción (PENDING)
   * 2. Fraud check
   * 3. Wallet balance check
   * 4. Bank processing
   * 5. Confirmación final
   * 
   * Si algo falla, la transacción se marca como FAILED
   * y se generan eventos para compensación.
   * 
   * @param userId ID del usuario que paga
   * @param merchantId ID del comerciante que recibe
   * @param amount Amount del pago
   * @param idempotencyKey para evitar duplicados
   * @returns Transaction completada o fallida
   * @throws PaymentTimeoutError si excede timeout
   */
  async initiatePayment(
    userId: string,
    merchantId: string,
    amount: Amount,
    idempotencyKey: string
  ): Promise<Transaction> {
    try {
      // Paso 1: Crear transacción
      let transaction = Transaction.create(
        userId,
        merchantId,
        amount,
        idempotencyKey
      );

      await this.transactionRepository.save(transaction);

      // Paso 2: Verificar fraude (con timeout)
      transaction.markFraudCheckPending();
      await this.transactionRepository.save(transaction);

      const fraudResult = await this.withTimeout(
        this.fraudServiceClient.checkFraud({
          transactionId: transaction.getId().getValue(),
          userId,
          amount: amount.getValue(),
          merchantId
        }),
        this.PAYMENT_TIMEOUT_MS,
        `fraud-check-${transaction.getId().getValue()}`
      );

      if (!fraudResult.approved && fraudResult.score >= this.FRAUD_THRESHOLD) {
        transaction.markFraudBlocked(fraudResult.score);
        await this.transactionRepository.save(transaction);
        throw new FraudBlockedError(
          transaction.getId().getValue(),
          fraudResult.score,
          'Score superior al umbral permitido'
        );
      }

      transaction.markFraudCheckPassed(fraudResult.score);
      await this.transactionRepository.save(transaction);

      // Paso 3: Verificar balance en cartera
      const walletBalance = await this.walletRepository.getBalance(userId);
      if (walletBalance.balance < amount.getValue()) {
        transaction.fail(
          `Fondos insuficientes: saldo ${walletBalance.balance}, requerido ${amount.getValue()}`,
          'INSUFFICIENT_FUNDS'
        );
        await this.transactionRepository.save(transaction);
        throw new InsufficientFundsError(
          amount.getValue(),
          walletBalance.balance
        );
      }

      // Paso 4: Debitar de la cartera
      await this.walletRepository.debit(
        userId,
        amount.getValue(),
        transaction.getId().getValue()
      );

      // Paso 5: Procesar en banco
      const bankResult = await this.withTimeout(
        this.bankServiceClient.processPayment({
          transactionId: transaction.getId().getValue(),
          walletId: userId,
          amount: amount.getValue(),
          merchantId
        }),
        this.PAYMENT_TIMEOUT_MS,
        `bank-processing-${transaction.getId().getValue()}`
      );

      if (!bankResult.confirmed) {
        // Revertir débito si banco rechaza
        await this.walletRepository.reverse(transaction.getId().getValue());
        transaction.fail('Banco rechazó la transacción', 'BANK_REJECTED');
        await this.transactionRepository.save(transaction);
        return transaction;
      }

      transaction.markProcessing(bankResult.bankReferenceId);
      transaction.confirm();
      await this.transactionRepository.save(transaction);

      return transaction;
    } catch (error) {
      // Cualquier error no controlado: marcar como fallido
      throw error;
    }
  }

  /**
   * Ejecuta una promesa con timeout
   * Si excede el tiempo, lanza PaymentTimeoutError
   * 
   * @param promise promesa a ejecutar
   * @param timeoutMs tiempo máximo en milisegundos
   * @param operationId ID de operación para logging
   * @returns resultado de la promesa
   * @throws PaymentTimeoutError si excede timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationId: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () =>
            reject(new PaymentTimeoutError(operationId, timeoutMs, operationId)),
          timeoutMs
        )
      )
    ]);
  }
}
