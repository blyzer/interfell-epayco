/**
 * InitiatePaymentCommand
 * 
 * Data Transfer Object que representa el comando para iniciar un pago.
 * 
 * Responsabilidades:
 * - Encapsular parámetros de entrada
 * - Validación básica de tipos
 * - Transferencia entre capas (HTTP → Application → Domain)
 * 
 * No contiene lógica de negocio (eso es del dominio).
 * Solo es un contenedor de datos.
 * 
 * Patrón: Command Bus (CQRS)
 */

export class InitiatePaymentCommand {
  /**
   * Constructor
   * @param userId ID del usuario que paga
   * @param merchantId ID del comerciante que recibe
   * @param amount Cantidad a pagar (en unidades de la moneda)
   * @param currency Moneda (ej: COP, USD)
   * @param idempotencyKey Clave única para evitar duplicados
   */
  constructor(
    readonly userId: string,
    readonly merchantId: string,
    readonly amount: number,
    readonly currency: string,
    readonly idempotencyKey: string
  ) {
    // Validaciones básicas
    if (!userId || typeof userId !== 'string') {
      throw new Error('userId es requerido y debe ser string');
    }
    if (!merchantId || typeof merchantId !== 'string') {
      throw new Error('merchantId es requerido y debe ser string');
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      throw new Error('amount debe ser un número positivo');
    }
    if (!currency || typeof currency !== 'string') {
      throw new Error('currency es requerido y debe ser string');
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      throw new Error('idempotencyKey es requerido y debe ser string');
    }
  }
}
