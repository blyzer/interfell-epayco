/**
 * InsufficientFundsError - Domain Error
 * 
 * Excepción de negocio: fondos insuficientes en cartera.
 * 
 * No es error técnico, es regla de negocio.
 * Se mapea a HTTP 402 PAYMENT_REQUIRED.
 */

export class InsufficientFundsError extends Error {
  readonly code = 'INSUFFICIENT_FUNDS';
  readonly httpStatus = 402;

  constructor(
    readonly requiredAmount: number,
    readonly availableBalance: number
  ) {
    super(
      `Fondos insuficientes. Requerido: ${requiredAmount}, Disponible: ${availableBalance}`
    );
    Object.setPrototypeOf(this, InsufficientFundsError.prototype);
  }
}
