/**
 * PaymentFailedEvent - Domain Event
 * 
 * Evento: pago falló (por cualquier razón).
 * Marca que se requiere compensación si ya hubo débito.
 */

export class PaymentFailedEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateType = 'Transaction';

  constructor(
    readonly transactionId: string,
    readonly reason: string,
    readonly errorCode: string,
    readonly requiresCompensation: boolean
  ) {
    this.eventId = `payment-failed-${transactionId}-${Date.now()}`;
    this.occurredAt = new Date();
  }

  toJSON() {
    return {
      eventType: 'PaymentFailed',
      eventId: this.eventId,
      aggregateId: this.transactionId,
      aggregateType: this.aggregateType,
      payload: {
        transactionId: this.transactionId,
        reason: this.reason,
        errorCode: this.errorCode,
        requiresCompensation: this.requiresCompensation
      },
      occurredAt: this.occurredAt.toISOString(),
      version: 1
    };
  }
}
