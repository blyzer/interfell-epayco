# 💳 Payment Service - Microservicio de Pagos

Microservicio production-ready para procesamiento de pagos con **Domain-Driven Design (DDD)**, **Clean Architecture**, y **SAGA Pattern**.

## 🎯 Quick Start (5 minutos)

### 1. Requisitos
- Node.js 18+
- PostgreSQL 13+
- Docker (opcional)

### 2. Instalación

```bash
# Clonar/extraer proyecto
git clone <repo> && cd payment-service

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env
```

### 3. Base de Datos

```bash
# Iniciar PostgreSQL (Docker)
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15

# Crear BD y ejecutar migrations
psql -U postgres -h localhost -f src/infrastructure/persistence/001_create_transactions.sql
```

### 4. Ejecutar

```bash
# Desarrollo
npm run dev
# Listening on port 3000

# Tests
npm test

# Build
npm run build
npm start
```

### 5. Probar API

```bash
# Iniciar pago
curl -X POST http://localhost:3000/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "merchantId": "merchant-456",
    "amount": 100000,
    "currency": "COP",
    "idempotencyKey": "order-789-2025-12-17"
  }'

# Respuesta exitosa
{
  "success": true,
  "data": {
    "transactionId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "CONFIRMED",
    "amount": 100000,
    "currency": "COP",
    "bankReferenceId": "BANK-12345"
  },
  "timestamp": "2025-12-17T22:18:00Z"
}
```

## 📊 Arquitectura

### 4 Capas Independientes

```
Presentation (HTTP)
    ↓
Application (Use Cases)
    ↓
Domain (Business Logic)
    ↓
Infrastructure (Technical)
```

### Flujo SAGA de Pago

```
1. Crear transacción
   ↓
2. Verificar fraude (timeout 30s)
   ↓
3. Verificar balance cartera
   ↓
4. Debitar cartera
   ↓
5. Procesar en banco (timeout 30s)
   ├─ Éxito: CONFIRMAR
   └─ Fallo: COMPENSAR (revertir débito)
```

## 📁 Estructura

```
src/
├── domain/              # Lógica de negocio pura
│   ├── aggregates/
│   ├── value-objects/
│   ├── services/
│   ├── events/
│   ├── errors/
│   └── repositories/
├── application/         # Casos de uso
│   ├── commands/
│   ├── queries/
│   └── dto/
├── infrastructure/      # Técnico
│   ├── repositories/
│   ├── clients/
│   └── persistence/
└── presentation/        # HTTP
    └── controllers/
```

## 🔑 Conceptos Clave

### Domain-Driven Design
- **Aggregate Root**: Transaction (orquesta ciclo de vida)
- **Value Objects**: Amount, TransactionId (con validaciones)
- **Domain Services**: PaymentOrchestrationService (SAGA)
- **Domain Events**: Auditoría y integración asíncrona
- **Domain Errors**: Excepciones de negocio (no técnicas)

### SAGA Pattern
- Orquestación centralizada de pasos distribuidos
- Compensación automática en fallos
- Timeout handling en cada paso (30s)
- Logging completo para debugging

### Idempotencia
- Previene pagos duplicados
- Busca por idempotencyKey antes de procesar
- Retorna resultado anterior si ya existe

## 🧪 Testing

```bash
# Todos los tests
npm test

# Watch mode
npm test --watch

# Coverage
npm test -- --coverage
```

Tests unitarios sin dependencias:
- Domain logic (puro)
- No BD
- No HTTP
- Patrón AAA (Arrange-Act-Assert)

## 📝 API Endpoints

### POST /payments/initiate
Inicia un pago

**Request:**
```json
{
  "userId": "user-123",
  "merchantId": "merchant-456",
  "amount": 100000,
  "currency": "COP",
  "idempotencyKey": "unique-order-id"
}
```

**Response (200):** Pago confirmado
**Response (202):** Pago procesándose
**Response (402):** Fondos insuficientes
**Response (403):** Fraude detectado
**Response (409):** Transacción duplicada
**Response (504):** Timeout en servicio externo

### GET /payments/:transactionId
Consulta estado de pago (TODO: implementar)

## 🚀 Próximos Pasos (TODOs)

**Críticos:**
- [ ] Implementar WalletRepository (balance/debit/credit)
- [ ] Implementar EventPublisher (SNS/SQS)
- [ ] Exception Filters (middleware Express)
- [ ] Auth Middleware (JWT)

**Importantes:**
- [ ] Query Handlers (GetTransaction)
- [ ] Integration Tests
- [ ] E2E Tests
- [ ] CI/CD (GitHub Actions)

**Nice to Have:**
- [ ] Circuit Breaker
- [ ] OpenAPI/Swagger
- [ ] Monitoring (CloudWatch)
- [ ] Redis Caching

## 📚 Para Interview

Menciona:
1. **DDD**: Cómo separamos lógica de negocio del framework
2. **SAGA**: Por qué es mejor que 2PC para transacciones distribuidas
3. **Idempotencia**: Cómo prevenimos pagos duplicados
4. **Value Objects**: Por qué Amount es VO, no just number
5. **Domain Events**: Auditoría y integración asíncrona

## 🤝 Contribuir

```bash
git checkout -b feature/my-feature
npm test
git push origin feature/my-feature
```

## 📄 Licencia

MIT

---

**Generado:** 2025-12-17
**Stack:** TypeScript + Node.js + PostgreSQL + Express
**Patrón:** DDD + Clean Architecture + SAGA
