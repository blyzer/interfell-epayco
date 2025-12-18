/**
 * IdempotencyKeyCollisionError - Domain Error
 * 
 * Excepción: ya existe una transacción con esta idempotency key.
 * Se mapea a HTTP 409 CONFLICT.
 */

export class IdempotencyKeyCollisionError extends Error {
  readonly code = 'IDEMPOTENCY_CONFLICT';
  readonly httpStatus = 409;

  constructor(
    readonly idempotencyKey: string,
    readonly existingTransactionId: string
  ) {
    super(
      `Transacción ya fue procesada con esta idempotency key. ID: ${existingTransactionId}`
    );
    Object.setPrototypeOf(this, IdempotencyKeyCollisionError.prototype);
  }
}
