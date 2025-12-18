/**
 * InitiatePaymentHandler - Application Service
 * 
 * Manejador del comando InitiatePaymentCommand.
 * 
 * Responsabilidades:
 * - Validar idempotencia (¿ya fue procesado?)
 * - Convertir DTOs a Value Objects
 * - Invocar PaymentOrchestrationService
 * - Publicar eventos de dominio
 * - Retornar resultado
 * 
 * Por qué es Application Service:
 * - Orquesta entre capas
 * - Usa inyección de dependencias
 * - Maneja transacciones
 * - No contiene lógica de negocio pura
 * 
 * Patrón: Command Handler (CQRS)
 */

import { InitiatePaymentCommand } from './initiate-payment.command';
import { Transaction } from '../../domain/aggregates/transaction.aggregate';
import { Amount } from '../../domain/value-objects/amount.vo';
import { PaymentOrchestrationService } from '../../domain/services/payment-orchestrator.service';
import { ITransactionRepository } from '../../domain/repositories/transaction.repository';

export interface IEventPublisher {
  publish(events: any[]): Promise<void>;
}

export class InitiatePaymentHandler {
  constructor(
    private paymentOrchestrationService: PaymentOrchestrationService,
    private transactionRepository: ITransactionRepository,
    private eventPublisher?: IEventPublisher
  ) {}

  /**
   * Procesa el comando de iniciar pago
   * 
   * Pasos:
   * 1. Validar idempotencia
   * 2. Convertir a Value Objects
   * 3. Invocar servicio de dominio
   * 4. Guardar resultado
   * 5. Publicar eventos
   * 
   * @param command InitiatePaymentCommand
   * @returns Transaction completada
   * @throws Error si ya fue procesado (idempotencia)
   */
  async handle(command: InitiatePaymentCommand): Promise<Transaction> {
    // Paso 1: Validar idempotencia
    // Buscar si ya existe una transacción con esta idempotencyKey
    const existingTransaction = await this.transactionRepository.findByIdempotencyKey(
      command.idempotencyKey
    );

    if (existingTransaction) {
      // Ya fue procesado - retornar el resultado anterior
      // Esto previene pagos duplicados en caso de reintentos
      console.log(
        `[Handler] Transacción duplicada detectada: ${command.idempotencyKey}`,
        `Retornando transacción existente: ${existingTransaction.getId().getValue()}`
      );
      return existingTransaction;
    }

    // Paso 2: Convertir a Value Objects
    const amount = Amount.create(command.amount, command.currency);

    // Paso 3: Invocar servicio de dominio (SAGA)
    const transaction = await this.paymentOrchestrationService.initiatePayment(
      command.userId,
      command.merchantId,
      amount,
      command.idempotencyKey
    );

    // Paso 4: Guardar resultado (ya hecho en el servicio, pero asegurar)
    await this.transactionRepository.save(transaction);

    // Paso 5: Publicar eventos de dominio
    const domainEvents = transaction.getDomainEvents();
    if (this.eventPublisher && domainEvents.length > 0) {
      try {
        await this.eventPublisher.publish(domainEvents);
        console.log(
          `[Handler] ${domainEvents.length} eventos publicados para transacción ${transaction.getId().getValue()}`
        );
      } catch (error) {
        // Los eventos fallaron, pero la transacción ya fue guardada
        console.error('[Handler] Error publicando eventos:', error);
        // TODO: Implementar retry logic o event sourcing
      }
    }

    // Limpiar eventos después de publicar
    transaction.clearDomainEvents();

    return transaction;
  }
}
