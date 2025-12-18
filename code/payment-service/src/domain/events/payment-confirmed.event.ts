/**
 * PaymentConfirmedEvent - Domain Event
 * 
 * Evento crítico: pago confirmado exitosamente en el banco.
 */

export class PaymentConfirmedEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateType = 'Transaction';

  constructor(
    readonly transactionId: string,
    readonly amount: number,
    readonly currency: string,
    readonly userId: string,
    readonly bankReferenceId: string
  ) {
    this.eventId = `payment-confirmed-${transactionId}-${Date.now()}`;
    this.occurredAt = new Date();
  }

  toJSON() {
    return {
      eventType: 'PaymentConfirmed',
      eventId: this.eventId,
      aggregateId: this.transactionId,
      aggregateType: this.aggregateType,
      payload: {
        transactionId: this.transactionId,
        amount: this.amount,
        currency: this.currency,
        userId: this.userId,
        bankReferenceId: this.bankReferenceId
      },
      occurredAt: this.occurredAt.toISOString(),
      version: 1
    };
  }
}
