/**
 * PaymentController - Presentation Layer
 * 
 * Controlador HTTP que expone los endpoints de pago.
 * Responsabilidades:
 * - Validar entrada HTTP
 * - Mapear DTOs a comandos de dominio
 * - Invocar handlers
 * - Mapear excepciones a códigos HTTP semánticos
 * - Retornar respuestas JSON
 * 
 * No contiene lógica de negocio (eso es del dominio).
 */

import { Request, Response } from 'express';
import { InitiatePaymentHandler } from '../../application/commands/initiate-payment.handler';
import { InitiatePaymentCommand } from '../../application/commands/initiate-payment.command';
import { Amount } from '../../domain/value-objects/amount.vo';
import { InsufficientFundsError } from '../../domain/errors/insufficient-funds.error';
import { FraudBlockedError } from '../../domain/errors/fraud-blocked.error';
import { PaymentTimeoutError } from '../../domain/errors/payment-timeout.error';

export class PaymentController {
  constructor(private initiatePaymentHandler: InitiatePaymentHandler) {}

  /**
   * POST /payments/initiate
   * 
   * Inicia una transacción de pago
   * 
   * Request body:
   * {
   *   "userId": "user-123",
   *   "merchantId": "merchant-456",
   *   "amount": 100000,
   *   "currency": "COP",
   *   "idempotencyKey": "order-789"
   * }
   * 
   * Respuestas posibles:
   * - 200 OK: Pago confirmado
   * - 202 ACCEPTED: Pago procesándose
   * - 402 PAYMENT_REQUIRED: Fondos insuficientes
   * - 403 FORBIDDEN: Fraude detectado
   * - 409 CONFLICT: Transacción duplicada (idempotency)
   * - 504 GATEWAY_TIMEOUT: Timeout en servicio externo
   * - 500 INTERNAL_ERROR: Error no controlado
   */
  async initiatePayment(req: Request, res: Response): Promise<void> {
    try {
      // Validar entrada
      const { userId, merchantId, amount, currency, idempotencyKey } = req.body;

      if (!userId || !merchantId || !amount || !idempotencyKey) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Campos requeridos: userId, merchantId, amount, idempotencyKey'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_AMOUNT',
            message: 'amount debe ser un número positivo'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Crear comando
      const command = new InitiatePaymentCommand(
        userId,
        merchantId,
        amount,
        currency || 'COP',
        idempotencyKey
      );

      // Ejecutar handler
      const transaction = await this.initiatePaymentHandler.handle(command);

      // Mapear respuesta
      if (transaction.getStatus() === 'CONFIRMED') {
        res.status(200).json({
          success: true,
          data: {
            transactionId: transaction.getId().getValue(),
            status: transaction.getStatus(),
            amount: transaction.getAmount().getValue(),
            currency: transaction.getAmount().getCurrency(),
            bankReferenceId: transaction.getBankReferenceId()
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Si no está confirmado pero tampoco falló, retornar 202 (procesando)
      res.status(202).json({
        success: true,
        data: {
          transactionId: transaction.getId().getValue(),
          status: transaction.getStatus(),
          amount: transaction.getAmount().getValue(),
          currency: transaction.getAmount().getCurrency()
        },
        message: 'Pago en proceso',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * GET /payments/:transactionId
   * 
   * Consulta el estado de una transacción
   */
  async getPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;

      if (!transactionId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TRANSACTION_ID',
            message: 'transactionId requerido'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // TODO: Implementar query handler para obtener transacción
      res.status(200).json({
        success: true,
        message: 'TODO: Implementar getPaymentStatus',
        transactionId
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Mapea excepciones de dominio a códigos HTTP semánticos
   */
  private handleError(error: any, res: Response): void {
    console.error('[PaymentController] Error:', error);

    // Fondos insuficientes → 402 PAYMENT_REQUIRED
    if (error instanceof InsufficientFundsError) {
      res.status(402).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_FUNDS',
          message: `Fondos insuficientes. Requerido: ${error.message}`
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Fraude detectado → 403 FORBIDDEN
    if (error instanceof FraudBlockedError) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FRAUD_BLOCKED',
          message: `Transacción bloqueada por fraude: ${error.message}`
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Timeout → 504 GATEWAY_TIMEOUT
    if (error instanceof PaymentTimeoutError) {
      res.status(504).json({
        success: false,
        error: {
          code: 'GATEWAY_TIMEOUT',
          message: `Timeout procesando pago: ${error.message}`
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Duplicado (idempotency) → 409 CONFLICT
    if (error.code === 'IDEMPOTENCY_CONFLICT') {
      res.status(409).json({
        success: false,
        error: {
          code: 'IDEMPOTENCY_CONFLICT',
          message: 'Transacción ya fue procesada con esta idempotency key',
          transactionId: error.transactionId
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Error genérico → 500 INTERNAL_SERVER_ERROR
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Error procesando pago'
      },
      timestamp: new Date().toISOString()
    });
  }
}
