/**
 * PaymentTimeoutError - Domain Error
 * 
 * Excepción: timeout comunicándose con servicio externo.
 * Se mapea a HTTP 504 GATEWAY_TIMEOUT.
 */

export class PaymentTimeoutError extends Error {
  readonly code = 'PAYMENT_TIMEOUT';
  readonly httpStatus = 504;

  constructor(
    readonly operationId: string,
    readonly timeoutMs: number,
    readonly service: string
  ) {
    super(
      `Timeout procesando pago. Operación: ${operationId}, Timeout: ${timeoutMs}ms, Servicio: ${service}`
    );
    Object.setPrototypeOf(this, PaymentTimeoutError.prototype);
  }
}
