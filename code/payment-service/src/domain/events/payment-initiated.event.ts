/**
 * PaymentInitiatedEvent - Domain Event
 * 
 * Evento de dominio que representa el inicio de una transacción de pago.
 * 
 * Responsabilidades:
 * - Registrar lo que ocurrió en el negocio
 * - Permitir suscriptores (auditoría, analytics, notificaciones)
 * - Facilitar event sourcing futuro
 * 
 * Por qué es importante:
 * - Auditoría completa (qué pasó, cuándo, quién)
 * - Integración asíncrona (publicar a SNS/SQS)
 * - Debugging y troubleshooting
 * - Machine learning (histórico de eventos)
 */

export class PaymentInitiatedEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateType = 'Transaction';

  constructor(
    readonly transactionId: string,
    readonly userId: string,
    readonly merchantId: string,
    readonly amount: number,
    readonly currency: string,
    readonly idempotencyKey: string
  ) {
    this.eventId = `payment-initiated-${transactionId}-${Date.now()}`;
    this.occurredAt = new Date();
  }

  /**
   * Para serialización a JSON (auditoría, eventos)
   */
  toJSON() {
    return {
      eventType: 'PaymentInitiated',
      eventId: this.eventId,
      aggregateId: this.transactionId,
      aggregateType: this.aggregateType,
      payload: {
        transactionId: this.transactionId,
        userId: this.userId,
        merchantId: this.merchantId,
        amount: this.amount,
        currency: this.currency,
        idempotencyKey: this.idempotencyKey
      },
      occurredAt: this.occurredAt.toISOString(),
      version: 1
    };
  }
}
