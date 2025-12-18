/**
 * main.ts - Application Bootstrap
 * 
 * Punto de entrada de la aplicación.
 * Configura e inyecta dependencias, setup de Express server.
 * 
 * Orden de inicialización:
 * 1. Cargar variables de entorno
 * 2. Configurar BD
 * 3. Crear instancias de servicios
 * 4. Registrar rutas
 * 5. Iniciar servidor HTTP
 */

import 'dotenv/config';
import express, { Express } from 'express';
import { Pool } from 'pg';
import { PaymentController } from './presentation/controllers/payment.controller';
import { InitiatePaymentHandler } from './application/commands/initiate-payment.handler';
import { PaymentOrchestrationService } from './domain/services/payment-orchestrator.service';
import { PostgresTransactionRepository } from './infrastructure/repositories/postgres-transaction.repository';
import { FraudServiceClient } from './infrastructure/clients/fraud-client';
import { BankIntegrationClient } from './infrastructure/clients/bank-client';

/**
 * Inicializa la aplicación Express
 */
async function bootstrapApp(): Promise<Express> {
  // Validar variables de entorno
  const requiredEnvVars = [
    'DATABASE_URL',
    'FRAUD_SERVICE_URL',
    'BANK_SERVICE_URL',
    'BANK_API_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Variable de entorno requerida: ${envVar}`);
    }
  }

  // 1. Configurar conexión a BD
  console.log('[Bootstrap] Conectando a PostgreSQL...');
  const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  // Verificar conexión
  try {
    const connection = await dbPool.connect();
    connection.release();
    console.log('[Bootstrap] ✓ Conexión a BD exitosa');
  } catch (error) {
    console.error('[Bootstrap] ✗ Error conectando a BD:', error);
    throw error;
  }

  // 2. Crear instancias de repositorios
  const transactionRepository = new PostgresTransactionRepository(dbPool);

  // 3. Crear clientes HTTP
  const fraudServiceClient = new FraudServiceClient(
    process.env.FRAUD_SERVICE_URL!
  );
  const bankServiceClient = new BankIntegrationClient(
    process.env.BANK_SERVICE_URL!,
    process.env.BANK_API_KEY!
  );

  // 4. Crear servicios de dominio
  const paymentOrchestrationService = new PaymentOrchestrationService(
    transactionRepository,
    null, // TODO: IWalletRepository inyectado
    fraudServiceClient,
    bankServiceClient
  );

  // 5. Crear handlers
  const initiatePaymentHandler = new InitiatePaymentHandler(
    paymentOrchestrationService,
    transactionRepository,
    null // TODO: IEventPublisher inyectado
  );

  // 6. Crear controladores
  const paymentController = new PaymentController(initiatePaymentHandler);

  // 7. Crear app Express
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'payment-service' });
  });

  // Rutas
  app.post('/payments/initiate', (req, res) =>
    paymentController.initiatePayment(req, res)
  );
  app.get('/payments/:transactionId', (req, res) =>
    paymentController.getPaymentStatus(req, res)
  );

  // Error handler (middleware final)
  app.use((err: any, req: express.Request, res: express.Response, next: any) => {
    console.error('[Error Handler]', err);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Error interno'
      },
      timestamp: new Date().toISOString()
    });
  });

  console.log('[Bootstrap] ✓ Aplicación configurada');
  return app;
}

/**
 * Inicia el servidor HTTP
 */
async function main() {
  try {
    const app = await bootstrapApp();
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`[Server] Listening on port ${PORT}`);
      console.log(`[Server] Health check: http://localhost:${PORT}/health`);
      console.log(`[Server] Initiate payment: POST http://localhost:${PORT}/payments/initiate`);
    });
  } catch (error) {
    console.error('[Main] Error starting server:', error);
    process.exit(1);
  }
}

main();
