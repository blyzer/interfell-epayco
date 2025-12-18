/**
 * 001_create_transactions.sql - Database Migration
 * 
 * Schema para transacciones de pago.
 * Incluye índices para performance.
 * 
 * Ejecutar con:
 * psql -U postgres -d postgres -f 001_create_transactions.sql
 */

-- Crear ENUM para estados de transacción
CREATE TYPE transaction_status AS ENUM (
  'PENDING',
  'FRAUD_CHECK_PENDING',
  'FRAUD_BLOCKED',
  'WALLET_CHECK_PENDING',
  'INSUFFICIENT_FUNDS',
  'PROCESSING',
  'CONFIRMED',
  'FAILED',
  'COMPENSATED'
);

-- Tabla principal: transacciones
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  merchant_id VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'COP' NOT NULL,
  status transaction_status DEFAULT 'PENDING' NOT NULL,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  fraud_score SMALLINT,
  bank_reference_id VARCHAR(255) UNIQUE,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices para performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_idempotency_key ON transactions(idempotency_key);
CREATE INDEX idx_transactions_bank_reference_id ON transactions(bank_reference_id);

-- Tabla de auditoría (compliance)
CREATE TABLE transaction_audit_log (
  id SERIAL PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  old_status transaction_status,
  new_status transaction_status,
  changed_by VARCHAR(255),
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_transaction_audit_log_transaction_id ON transaction_audit_log(transaction_id);
CREATE INDEX idx_transaction_audit_log_created_at ON transaction_audit_log(created_at);

-- Tabla de movimientos de cartera (para compensación)
CREATE TABLE wallet_movements (
  id SERIAL PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  user_id VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  movement_type VARCHAR(20) NOT NULL, -- 'DEBIT', 'CREDIT', 'REVERSAL'
  balance_after DECIMAL(15, 2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_wallet_movements_user_id ON wallet_movements(user_id);
CREATE INDEX idx_wallet_movements_transaction_id ON wallet_movements(transaction_id);
CREATE INDEX idx_wallet_movements_created_at ON wallet_movements(created_at);
