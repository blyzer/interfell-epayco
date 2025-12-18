/**
 * FraudBlockedError - Domain Error
 * 
 * Excepción: transacción bloqueada por fraude.
 * Se mapea a HTTP 403 FORBIDDEN.
 */

export class FraudBlockedError extends Error {
  readonly code = 'FRAUD_BLOCKED';
  readonly httpStatus = 403;

  constructor(
    readonly transactionId: string,
    readonly fraudScore: number,
    readonly reason: string
  ) {
    super(
      `Transacción bloqueada por fraude. Score: ${fraudScore}/100. ${reason}`
    );
    Object.setPrototypeOf(this, FraudBlockedError.prototype);
  }
}
