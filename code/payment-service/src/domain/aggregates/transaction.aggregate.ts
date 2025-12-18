/**
 * Transaction Aggregate Root
 * 
 * Representa una transacción de pago en el sistema.
 * Es el aggregate root que encapsula toda la lógica de negocio
 * relacionada con una transacción de pago.
 * 
 * Estados posibles:
 * - PENDING: Iniciado, esperando procesamiento
 * - FRAUD_CHECK_PENDING: Verificando fraude
 * - FRAUD_BLOCKED: Rechazado por fraude
 * - WALLET_CHECK_PENDING: Verificando balance
 * - INSUFFICIENT_FUNDS: Fondos insuficientes
 * - PROCESSING: Enviado a banco
 * - CONFIRMED: Completado exitosamente
 * - FAILED: Falló por razón técnica
 * - COMPENSATED: Se revirtió la transacción (refund)
 * 
 * @domain-logic Orquesta el SAGA de pago
 */

import { TransactionId } from '../value-objects/transaction-id.vo';
import { Amount } from '../value-objects/amount.vo';
import { PaymentInitiatedEvent } from '../events/payment-initiated.event';
import { FraudCheckPassedEvent } from '../events/fraud-check-passed.event';
import { PaymentConfirmedEvent } from '../events/payment-confirmed.event';
import { PaymentFailedEvent } from '../events/payment-failed.event';

export enum TransactionStatus {
  PENDING = 'PENDING',
  FRAUD_CHECK_PENDING = 'FRAUD_CHECK_PENDING',
  FRAUD_BLOCKED = 'FRAUD_BLOCKED',
  WALLET_CHECK_PENDING = 'WALLET_CHECK_PENDING',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  PROCESSING = 'PROCESSING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  COMPENSATED = 'COMPENSATED'
}

export class Transaction {
  private domainEvents: any[] = [];

  private constructor(
    private readonly id: TransactionId,
    private readonly userId: string,
    private readonly merchantId: string,
    private readonly amount: Amount,
    private readonly idempotencyKey: string,
    private status: TransactionStatus = TransactionStatus.PENDING,
    private fraudScore?: number,
    private bankReferenceId?: string,
    private failureReason?: string,
    private createdAt: Date = new Date()
  ) {}

  /**
   * Crea una nueva transacción
   */
  static create(
    userId: string,
    merchantId: string,
    amount: Amount,
    idempotencyKey: string
  ): Transaction {
    const transaction = new Transaction(
      TransactionId.generate(),
      userId,
      merchantId,
      amount,
      idempotencyKey
    );

    // Registrar evento de dominio
    transaction.domainEvents.push(
      new PaymentInitiatedEvent(
        transaction.id.getValue(),
        userId,
        merchantId,
        amount.getValue(),
        amount.getCurrency(),
        idempotencyKey
      )
    );

    return transaction;
  }

  /**
   * Reconstruye una transacción desde la base de datos
   */
  static fromPersistence(data: any): Transaction {
    return new Transaction(
      TransactionId.from(data.id),
      data.userId,
      data.merchantId,
      Amount.create(data.amount, data.currency),
      data.idempotencyKey,
      data.status,
      data.fraudScore,
      data.bankReferenceId,
      data.failureReason,
      new Date(data.createdAt)
    );
  }

  // === GETTERS ===
  getId(): TransactionId {
    return this.id;
  }

  getStatus(): TransactionStatus {
    return this.status;
  }

  getAmount(): Amount {
    return this.amount;
  }

  getUserId(): string {
    return this.userId;
  }

  getMerchantId(): string {
    return this.merchantId;
  }

  getIdempotencyKey(): string {
    return this.idempotencyKey;
  }

  getFraudScore(): number | undefined {
    return this.fraudScore;
  }

  getBankReferenceId(): string | undefined {
    return this.bankReferenceId;
  }

  // === ESTADO TRANSITIONS ===

  /**
   * Marca que se está verificando fraude
   */
  markFraudCheckPending(): void {
    if (this.status !== TransactionStatus.PENDING) {
      throw new Error(
        `No se puede verificar fraude desde estado: ${this.status}`
      );
    }
    this.status = TransactionStatus.FRAUD_CHECK_PENDING;
  }

  /**
   * Marca fraude check como pasado
   */
  markFraudCheckPassed(score: number): void {
    if (this.status !== TransactionStatus.FRAUD_CHECK_PENDING) {
      throw new Error(
        `No se puede marcar fraude como pasado desde: ${this.status}`
      );
    }
    if (score < 0 || score > 100) {
      throw new Error(`Fraud score debe estar entre 0-100, recibido: ${score}`);
    }

    this.fraudScore = score;
    this.status = TransactionStatus.WALLET_CHECK_PENDING;

    this.domainEvents.push(
      new FraudCheckPassedEvent(
        this.id.getValue(),
        score,
        score < 40 ? 'LOW' : score < 70 ? 'MEDIUM' : 'HIGH'
      )
    );
  }

  /**
   * Marca que fraude fue detectado y bloquea transacción
   */
  markFraudBlocked(score: number): void {
    if (this.status !== TransactionStatus.FRAUD_CHECK_PENDING) {
      throw new Error(
        `No se puede bloquear desde estado: ${this.status}`
      );
    }

    this.fraudScore = score;
    this.status = TransactionStatus.FRAUD_BLOCKED;
    this.failureReason = `Fraude detectado: score ${score}/100`;

    this.domainEvents.push(
      new PaymentFailedEvent(
        this.id.getValue(),
        this.failureReason,
        'FRAUD_BLOCKED',
        false
      )
    );
  }

  /**
   * Marca que la transacción pasó wallet check y procede a banco
   */
  markProcessing(bankReferenceId: string): void {
    if (this.status !== TransactionStatus.WALLET_CHECK_PENDING) {
      throw new Error(
        `No se puede procesar desde estado: ${this.status}`
      );
    }

    this.status = TransactionStatus.PROCESSING;
    this.bankReferenceId = bankReferenceId;
  }

  /**
   * Marca transacción como confirmada (fue exitosa)
   */
  confirm(): void {
    if (this.status !== TransactionStatus.PROCESSING) {
      throw new Error(
        `No se puede confirmar desde estado: ${this.status}`
      );
    }

    this.status = TransactionStatus.CONFIRMED;

    this.domainEvents.push(
      new PaymentConfirmedEvent(
        this.id.getValue(),
        this.amount.getValue(),
        this.amount.getCurrency(),
        this.userId,
        this.bankReferenceId!
      )
    );
  }

  /**
   * Marca transacción como fallida
   */
  fail(reason: string, errorCode: string): void {
    this.status = TransactionStatus.FAILED;
    this.failureReason = reason;

    this.domainEvents.push(
      new PaymentFailedEvent(
        this.id.getValue(),
        reason,
        errorCode,
        true // requiere compensación
      )
    );
  }

  /**
   * Obtiene eventos de dominio registrados (para publicar después)
   */
  getDomainEvents(): any[] {
    return this.domainEvents;
  }

  /**
   * Limpia eventos después de ser publicados
   */
  clearDomainEvents(): void {
    this.domainEvents = [];
  }
}
