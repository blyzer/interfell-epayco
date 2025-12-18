/**
 * Transaction Aggregate - Unit Tests
 * 
 * Tests sin dependencias de BD, HTTP, o frameworks.
 * Solo lógica pura de dominio.
 * 
 * Patrón AAA: Arrange-Act-Assert
 */

import { Transaction } from '../../src/domain/aggregates/transaction.aggregate';
import { Amount } from '../../src/domain/value-objects/amount.vo';

describe('Transaction Aggregate', () => {
  describe('create', () => {
    it('debe crear una transacción con estado PENDING', () => {
      // Arrange
      const userId = 'user-123';
      const merchantId = 'merchant-456';
      const amount = Amount.create(100000, 'COP');
      const idempotencyKey = 'order-789';

      // Act
      const transaction = Transaction.create(userId, merchantId, amount, idempotencyKey);

      // Assert
      expect(transaction.getUserId()).toBe(userId);
      expect(transaction.getMerchantId()).toBe(merchantId);
      expect(transaction.getAmount()).toEqual(amount);
      expect(transaction.getIdempotencyKey()).toBe(idempotencyKey);
      expect(transaction.getStatus()).toBe('PENDING');
      expect(transaction.getDomainEvents().length).toBe(1);
    });
  });

  describe('fraud check transitions', () => {
    it('debe marcar como FRAUD_CHECK_PENDING', () => {
      // Arrange
      const transaction = Transaction.create(
        'user-1',
        'merchant-1',
        Amount.create(50000, 'COP'),
        'order-1'
      );

      // Act
      transaction.markFraudCheckPending();

      // Assert
      expect(transaction.getStatus()).toBe('FRAUD_CHECK_PENDING');
    });

    it('debe marcar como FRAUD_CHECK_PASSED y pasar a WALLET_CHECK', () => {
      // Arrange
      const transaction = Transaction.create(
        'user-1',
        'merchant-1',
        Amount.create(50000, 'COP'),
        'order-1'
      );
      transaction.markFraudCheckPending();

      // Act
      transaction.markFraudCheckPassed(25); // LOW fraud score

      // Assert
      expect(transaction.getStatus()).toBe('WALLET_CHECK_PENDING');
      expect(transaction.getFraudScore()).toBe(25);
    });

    it('debe bloquear si score es alto', () => {
      // Arrange
      const transaction = Transaction.create(
        'user-1',
        'merchant-1',
        Amount.create(50000, 'COP'),
        'order-1'
      );
      transaction.markFraudCheckPending();

      // Act
      transaction.markFraudBlocked(85); // HIGH fraud score

      // Assert
      expect(transaction.getStatus()).toBe('FRAUD_BLOCKED');
      expect(transaction.getFraudScore()).toBe(85);
    });
  });

  describe('validation', () => {
    it('debe rechazar transición inválida de estado', () => {
      // Arrange
      const transaction = Transaction.create(
        'user-1',
        'merchant-1',
        Amount.create(50000, 'COP'),
        'order-1'
      );

      // Act & Assert
      expect(() => {
        transaction.confirm(); // No está en estado PROCESSING
      }).toThrow();
    });

    it('debe rechazar fraud score inválido', () => {
      // Arrange
      const transaction = Transaction.create(
        'user-1',
        'merchant-1',
        Amount.create(50000, 'COP'),
        'order-1'
      );
      transaction.markFraudCheckPending();

      // Act & Assert
      expect(() => {
        transaction.markFraudCheckPassed(150); // Inválido: > 100
      }).toThrow();
    });
  });

  describe('domain events', () => {
    it('debe generar eventos al cambiar estado', () => {
      // Arrange
      const transaction = Transaction.create(
        'user-1',
        'merchant-1',
        Amount.create(50000, 'COP'),
        'order-1'
      );

      // Act
      let events = transaction.getDomainEvents();
      expect(events.length).toBe(1); // PaymentInitiatedEvent

      transaction.markFraudCheckPending();
      transaction.markFraudCheckPassed(30);
      events = transaction.getDomainEvents();

      // Assert
      expect(events.length).toBeGreaterThan(1);
      expect(events.some((e: any) => e.constructor.name === 'FraudCheckPassedEvent')).toBe(true);
    });

    it('debe limpiar eventos después de publicar', () => {
      // Arrange
      const transaction = Transaction.create(
        'user-1',
        'merchant-1',
        Amount.create(50000, 'COP'),
        'order-1'
      );
      expect(transaction.getDomainEvents().length).toBe(1);

      // Act
      transaction.clearDomainEvents();

      // Assert
      expect(transaction.getDomainEvents().length).toBe(0);
    });
  });
});
