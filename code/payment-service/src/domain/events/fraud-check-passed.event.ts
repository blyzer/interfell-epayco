/**
 * FraudCheckPassedEvent - Domain Event
 * 
 * Evento que indica que la verificación de fraude pasó exitosamente.
 */

export class FraudCheckPassedEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateType = 'Transaction';

  constructor(
    readonly transactionId: string,
    readonly fraudScore: number,
    readonly riskLevel: string // 'LOW', 'MEDIUM', 'HIGH'
  ) {
    this.eventId = `fraud-check-passed-${transactionId}-${Date.now()}`;
    this.occurredAt = new Date();
  }

  toJSON() {
    return {
      eventType: 'FraudCheckPassed',
      eventId: this.eventId,
      aggregateId: this.transactionId,
      aggregateType: this.aggregateType,
      payload: {
        transactionId: this.transactionId,
        fraudScore: this.fraudScore,
        riskLevel: this.riskLevel
      },
      occurredAt: this.occurredAt.toISOString(),
      version: 1
    };
  }
}
