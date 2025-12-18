# Payment Service - Arquitectura de Backend

**Versión:** 1.0.0  
**Estado:** Listo para Producción  
**última Actualización:** 17 de Diciembre de 2025

---

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Instalación y Configuración](#instalación-y-configuración)
6. [Configuración](#configuración)
7. [Ejecutar la Aplicación](#ejecutar-la-aplicación)
8. [Estrategia de Testing](#estrategia-de-testing)
9. [Infraestructura en Cloud](#infraestructura-en-cloud)
10. [Documentación de API](#documentación-de-api)
11. [Consideraciones de Seguridad](#consideraciones-de-seguridad)
12. [Monitoreo y Logging](#monitoreo-y-logging)
13. [Solución de Problemas](#solución-de-problemas)
14. [Contribuir](#contribuir)

---

## Descripción General

**Payment Service** es un backend de procesamiento de pagos de alto rendimiento listo para producción, construido con Node.js y TypeScript. Implementa patrones Domain-Driven Design (DDD), event sourcing y arquitectura CQRS para manejar operaciones de pago idempotentes a escala.

### Caracterí­sticas Principales

[OK] Garantí­a de Idempotencia - Previene procesamiento duplicado de pagos usando TTL de 24 horas  
[OK] Procesamiento Asincrónico - Procesamiento de comandos y eventos basado en SQS  
[OK] Soporte Multi-Base de Datos - PostgreSQL para transacciones, DynamoDB para idempotencia  
[OK] Rate Limiting - Algoritmo token bucket con lí­mites por usuario/IP  
[OK] Autenticación JWT - Control de acceso basado en roles (RBAC)  
[OK] Trazado Distribuido - Rastreo de Request ID y Correlation ID  
[OK] Logging en Producción - Logger Winston con rotación de archivos  
[OK] Manejo de Errores - Filtro de excepciones centralizado con respuestas estandarizadas  
[OK] Health Checks - Monitoreo de salud de base de datos, AWS y colas  
[OK] Integración de Wallet - Cliente HTTP para servicio de billetera externa

### Métricas de Rendimiento

- Throughput: 10,000+ solicitudes/minuto a escala
- Latencia P99: <200ms para consultas de transacciones
- Disponibilidad: SLA de 99.9% uptime
- Conexiones de Base de Datos: Pool de 5-20 conexiones (configurable)
- Rate Limiting: 100 solicitudes/minuto por usuario (configurable)

---

## Arquitectura

### Diseño de Alto Nivel

```
+-----------------------------------------------------+
|           Aplicaciones Cliente                     |
+---------------------+------------------------------+
                      |
                      v
+-----------------------------------------------------+
|        Express + NestJS HTTP API                  |
+-----------------------------------------------------+
|RequestID|RateLimit|Auth|Exception Filter          |
+---------------------+------------------------------+
                      |
         +------------+------------+
         v            v            v
     +--------+  +--------+  +--------+
     | CQRS   |  | Domain |  |External|
     |Handlers|  |Services|  |Clients |
     +--------+  +--------+  +--------+
         |            |            |
         +------------+------------+
                      |
         +------------+------------+
         v            v            v
     +-------+  +--------+  +-------+
     |Postgres| |DynamoDB| | SQS  |
     |(Events)|  |(Idem)  |  |(Comandos)
     +-------+  +--------+  +-------+
```

### Patrones de Diseño

**1. Domain-Driven Design (DDD)**
- Separación clara de responsabilidades (Domain, Application, Presentation)
- Value Objects para conceptos de negocio principales
- Aggregate Roots para gestión de transacciones
- Excepciones de Dominio para violaciones de reglas de negocio

**2. CQRS (Command Query Responsibility Segregation)**
- Modelos de lectura y escritura separados
- Query handlers para recuperar detalles de transacciones
- Command publishers para operaciones asincrónicas
- Event sourcing para auditorí­a

**3. Patrón de Idempotencia**
- TTL de 24 horas para prevención de duplicados
- DynamoDB para búsquedas rápidas
- Rastreo de estado (PENDING, COMPLETED, FAILED)
- Manejo de transacciones seguro para reproducción

**4. Patrón Strangler Fig**
- Migración gradual a microservicios
- Integración de servicio de billetera externa
- Rutas de deprecación para APIs heredadas

**5. Circuit Breaker**
- Verificaciones de salud para servicios externos
- Degradación graciosa en caso de fallos
- Lógica de reintento con backoff exponencial

---

## Stack Tecnológico

### Framework Backend
- Runtime: Node.js 18+
- Lenguaje: TypeScript 5.x
- Framework: NestJS 10.x (opcional para caracterí­sticas avanzadas)
- API: Express.js 4.x
- Gestor de Procesos: PM2

### Bases de Datos
- SQL: PostgreSQL 14+ (transacciones, eventos)
- NoSQL: DynamoDB (registros de idempotencia, TTL)
- Cola de Mensajes: AWS SQS (procesamiento de comandos/eventos)

### Librerí­as y Herramientas
- Cliente HTTP: Axios 1.x (servicio de billetera)
- Driver de Base de Datos: pg 8.x (PostgreSQL)
- AWS SDK: aws-sdk 2.x
- Logging: Winston 3.x
- Autenticación: jsonwebtoken 9.x
- Validación: class-validator + class-transformer
- UUID: uuid 9.x

### Testing y Calidad
- Unit Testing: Jest
- Integration Testing: Supertest
- E2E Testing: Playwright
- Cobertura de Código: >80% requerido
- Linting: ESLint + Prettier

### DevOps e Infraestructura
- Containerización: Docker
- Orquestación: Kubernetes (EKS)
- IaC: Terraform / CloudFormation
- Monitoreo: CloudWatch + Grafana
- Trazado Distribuido: X-Ray / Jaeger
- CI/CD: GitHub Actions / GitLab CI

---

## Estructura del Proyecto

```
payment-service/
+-- src/
|   +-- domain/                      # Capa de lógica de negocio
|   |   +-- services/
|   |   |   +-- idempotency-checker.service.ts
|   |   +-- repositories/
|   |   +-- aggregates/
|   |   +-- value-objects/
|   |   +-- exceptions/
|   |
|   +-- application/                 # Capa de casos de uso
|   |   +-- handlers/
|   |   |   +-- commands/
|   |   |   +-- queries/
|   |   |       +-- get-transaction.handler.ts
|   |   +-- queries/
|   |   |   +-- get-transaction.query.ts
|   |   +-- commands/
|   |   +-- dtos/
|   |   +-- validators/
|   |
|   +-- infrastructure/              # Capa técnica
|   |   +-- clients/
|   |   |   +-- sqs-publisher.ts
|   |   |   +-- wallet-client.ts
|   |   +-- config/
|   |   |   +-- aws-config.ts
|   |   |   +-- database.config.ts
|   |   |   +-- logging.config.ts
|   |   +-- messaging/
|   |   |   +-- sqs-command-publisher.ts
|   |   +-- persistence/
|   |   |   +-- postgres-connection.ts
|   |   +-- repositories/
|   |   |   +-- dynamodb-idempotency.repository.ts
|   |   +-- services/
|   |
|   +-- presentation/                # Capa de API
|   |   +-- controllers/
|   |   +-- dtos/
|   |   |   +-- payment-response.dto.ts
|   |   +-- filters/
|   |   |   +-- domain-exception.filter.ts
|   |   +-- middleware/
|   |   |   +-- auth-guard.middleware.ts
|   |   |   +-- rate-limit.middleware.ts
|   |   |   +-- request-id.middleware.ts
|   |   +-- decorators/
|   |
|   +-- app.module.ts
|   +-- main.ts
|
+-- test/
|   +-- unit/                        # Pruebas unitarias
|   |   +-- domain/
|   |   +-- application/
|   |   +-- infrastructure/
|   +-- integration/                 # Pruebas de integración
|   |   +-- api/
|   |   +-- database/
|   |   +-- aws/
|   +-- e2e/                         # Pruebas end-to-end
|       +-- payment.flow.spec.ts
|
+-- docker/
|   +-- Dockerfile
|   +-- docker-compose.yml
|   +-- .dockerignore
|
+-- kubernetes/
|   +-- deployment.yaml
|   +-- service.yaml
|   +-- configmap.yaml
|   +-- secrets.yaml
|   +-- hpa.yaml
|
+-- terraform/
|   +-- main.tf
|   +-- variables.tf
|   +-- outputs.tf
|   +-- rds.tf
|   +-- dynamodb.tf
|   +-- sqs.tf
|   +-- iam.tf
|   +-- networking.tf
|
+-- .env.example
+-- .env.production
+-- .eslintrc.json
+-- .prettierrc
+-- package.json
+-- tsconfig.json
+-- docker-compose.yml
+-- jest.config.js
+-- README.md
```

---

## Instalación y Configuración

### Requisitos Previos

- Node.js: 18.x o superior
- npm: 9.x o superior
- Docker: 20.x o superior (opcional, para containerización)
- PostgreSQL: 14+ (local o remoto)
- Cuenta de AWS: Para DynamoDB, SQS y otros servicios

### Clonar el Repositorio

```bash
git clone https://github.com/your-org/payment-service.git
cd payment-service
```

### Instalar Dependencias

```bash
npm install
```

### Desglose de Dependencias

```json
{
  "dependencies": {
    "aws-sdk": "^2.1400.0",
    "axios": "^1.6.0",
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "jsonwebtoken": "^9.1.0",
    "uuid": "^9.0.0",
    "winston": "^3.11.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "@nestjs/cqrs": "^10.2.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.0",
    "@types/jest": "^29.5.0",
    "typescript": "^5.2.0",
    "eslint": "^8.50.0",
    "prettier": "^3.0.0"
  }
}
```

---

## Configuración

### Variables de Entorno

Crear archivo `.env` (ver `.env.example` como plantilla):

```bash
# Entorno Node
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tu-contraseña
DB_NAME=payment_service
DB_SSL=false
DB_POOL_MIN=5
DB_POOL_MAX=20

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key

# Colas SQS
SQS_COMMAND_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/payment-commands
SQS_EVENT_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/payment-events
SQS_DLQ_URL=https://sqs.us-east-1.amazonaws.com/123456789/payment-dlq

# DynamoDB
DYNAMODB_IDEMPOTENCY_TABLE=payment-idempotency
DYNAMODB_REGION=us-east-1

# Autenticación
JWT_SECRET=tu-clave-super-secreta-minimo-32-caracteres
JWT_EXPIRY=24h

# Servicios Externos
WALLET_SERVICE_URL=https://wallet-service.example.com
WALLET_API_KEY=tu-api-key

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Logging
LOG_DIR=./logs
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=7
```

### Archivos de Configuración

**tsconfig.json** - Configuración de TypeScript:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "test"]
}
```

---

## Ejecutar la Aplicación

### Modo Desarrollo

```bash
# Iniciar con recarga automática
npm run dev

# Salida:
# [Nest] 12/17/25, 11:39:27 PM LOG [NestFactory] Starting Nest application...
# [Nest] 12/17/25, 11:39:28 PM LOG [InstanceLoader] ...
# [Nest] 12/17/25, 11:39:29 PM LOG [RouterExplorer] Mapped ...
# Aplicación ejecutándose en puerto 3000
```

### Build de Producción

```bash
# Compilar TypeScript
npm run build

# Iniciar servidor de producción
npm start

# O con PM2
pm2 start dist/main.js --name "payment-service"
pm2 logs payment-service
```

### Usando Docker

```bash
# Construir imagen
docker build -f docker/Dockerfile -t payment-service:latest .

# Ejecutar contenedor
docker run -d \
  --name payment-service \
  -p 3000:3000 \
  --env-file .env \
  payment-service:latest

# Usando docker-compose
docker-compose up -d
docker-compose logs -f api
```

---

## Estrategia de Testing

### Pruebas Unitarias

Probar componentes individuales aisladamente:

```bash
# Ejecutar pruebas unitarias
npm run test:unit

# Con cobertura
npm run test:unit -- --coverage

# Modo watch
npm run test:unit -- --watch
```

**Objetivo de Cobertura:** >80% de lógica de negocio

Ejemplo de prueba unitaria:

```typescript
describe('IdempotencyCheckerService', () => {
  let service: IdempotencyCheckerService;
  let repository: IIdempotencyRepository;

  beforeEach(() => {
    repository = mock(IIdempotencyRepository);
    service = new IdempotencyCheckerService(repository);
  });

  it('debe prevenir transacciones duplicadas', async () => {
    const idempotencyKey = 'test-key-123';
    
    jest.spyOn(repository, 'findByKey').mockResolvedValue(null);
    
    await service.recordTransaction(idempotencyKey, transactionId, 'PENDING');
    
    expect(repository.save).toHaveBeenCalled();
  });

  it('debe retornar resultado existente para clave duplicada', async () => {
    const idempotencyKey = 'test-key-123';
    const existingRecord = {
      status: 'COMPLETED',
      result: { transactionId: 'tx-123' },
    };
    
    jest.spyOn(repository, 'findByKey').mockResolvedValue(existingRecord);
    
    const result = await service.getTransactionResult(idempotencyKey);
    
    expect(result).toEqual(existingRecord.result);
  });
});
```

### Pruebas de Integración

Probar interacciones entre componentes:

```bash
# Ejecutar pruebas de integración
npm run test:integration

# Suite especí­fica
npm run test:integration -- database.spec.ts
```

Ejemplo de prueba de integración:

```typescript
describe('Payment API Integration', () => {
  let app: INestApplication;
  let db: PostgresConnection;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = moduleFixture.get(PostgresConnection);
  });

  it('debe procesar pago de extremo a extremo', async () => {
    const paymentRequest = {
      walletId: 'wallet-123',
      amount: 1000,
      currency: 'USD',
      idempotencyKey: uuidv4(),
    };

    const response = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${token}`)
      .send(paymentRequest)
      .expect(200);

    expect(response.body.status).toBe('COMPLETED');
    expect(response.body.transactionId).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
    await db.close();
  });
});
```

### Pruebas E2E

Probar flujos de usuario completos:

```bash
# Ejecutar pruebas E2E
npm run test:e2e

# Flujo especí­fico
npm run test:e2e -- payment.flow.spec.ts
```

### Pruebas de Rendimiento

Pruebas de carga y estrés con k6:

```bash
# Ejecutar prueba de carga
k6 run test/performance/payment-load-test.js

# Salida:
# execution: local
#   scenarios: [ 'default' ]
#   10 pasadas [====] 10s/30s, 100 RPS
#
# checks.....................: 99.8% pasadas / fallidas
# data_received.............: 2.3 MB / ...
# p95........................: 150ms
# p99........................: 200ms
```

### Sembrado de Datos de Prueba

```bash
# Sembrar base de datos de prueba
npm run db:seed:test

# Truncar datos de prueba
npm run db:truncate:test
```

### Integración Continua

Workflow de GitHub Actions (`.github/workflows/test.yml`):

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
      - run: npm run test:unit -- --coverage
      - run: npm run test:integration
      - run: npm run test:e2e
```

---

## Infraestructura en Cloud

### Arquitectura AWS

```
+----------------------------------------------------------+
|                    Cuenta AWS                            |
+----------------------------------------------------------+
|  +-----------------------------------------------------+ |
|  |             VPC (172.31.0.0/16)                    | |
|  +-----------------------------------------------------+ |
|  |  +------------------+  +------------------+       | |
|  |  |   Subred Pública |  | Subred Pública   |       | |
|  |  |  (us-east-1a)    |  | (us-east-1b)     |       | |
|  |  |                  |  |                  |       | |
|  |  |  +----+-----+    |  |  +----+-----+    |       | |
|  |  |  | ALB|     |    |  |  | ALB|     |    |       | |
|  |  |  | :80|:443 |    |  |  | :80|:443 |    |       | |
|  |  |  +--+-+-----+    |  |  +--+-+-----+    |       | |
|  |  +-----+------------+  +-----+----------+        | |
|  |        |                      |                   | |
|  |  +-----+------+--------+------+-----+            | |
|  |  |            |        |           |             | |
|  |  |  +-----------+---+  |           |             | |
|  |  |  | Cluster EKS |  |           | |             | |
|  |  |  | prod cluster|  |           | |             | |
|  |  |  +---+---+-----+  |           | |             | |
|  |  +-----+---+--------+           | |             | |
|  |                                  | |             | |
|  |  +------------------+  +--------+-+            | |
|  |  | Subred Privada   |  | Subred Privada       | |
|  |  |  (us-east-1a)    |  | (us-east-1b)         | |
|  |  |                  |  |                      | |
|  |  |  +----+-----+    |  |  +----+-----+        | |
|  |  |  | RDS      |    |  |  | RDS      |        | |
|  |  |  | Postgres |    |  |  | Standby  |        | |
|  |  |  | Multi-AZ |    |  |  |          |        | |
|  |  |  +----------+    |  |  +----------+        | |
|  |  +------------------+  +--------------------+ |
|  +-----------------------------------------------------+ |
|                                                        |
|  +----------+  +----------+  +-----------+            |
|  | DynamoDB |  |   SQS    |  | CloudWatch|            |
|  | (Idem)   |  | (Comandos|  |(Monitoreo)            |
|  +----------+  +----------+  +-----------+            |
+----------------------------------------------------------+
```

### Infraestructura Terraform

**Recursos Principales:**

```hcl
# Cluster EKS
resource "aws_eks_cluster" "payment_service" {
  name            = "payment-service-prod"
  role_arn        = aws_iam_role.eks_cluster.arn
  version         = "1.28"

  vpc_config {
    subnet_ids              = [aws_subnet.private_1a.id, aws_subnet.private_1b.id]
    security_groups         = [aws_security_group.eks.id]
    endpoint_private_access = true
    endpoint_public_access  = true
  }
}

# PostgreSQL RDS
resource "aws_db_instance" "payment_db" {
  identifier              = "payment-service-db"
  engine                  = "postgres"
  engine_version          = "14.7"
  instance_class          = "db.t3.medium"
  allocated_storage       = 100
  storage_encrypted       = true
  multi_az                = true
  publicly_accessible     = false
  skip_final_snapshot     = false
  final_snapshot_identifier = "payment-db-final-snapshot"

  db_name  = "payment_service"
  username = var.db_username
  password = var.db_password

  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql"]
}

# Tabla DynamoDB Idempotencia
resource "aws_dynamodb_table" "idempotency" {
  name           = "payment-idempotency"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "idempotencyKey"

  attribute {
    name = "idempotencyKey"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery_specification {
    enabled = true
  }

  tags = {
    Environment = "production"
    Service     = "payment-service"
  }
}

# Colas SQS
resource "aws_sqs_queue" "command_queue" {
  name                      = "payment-commands"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 1209600

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Environment = "production"
    Service     = "payment-service"
  }
}

resource "aws_sqs_queue" "dlq" {
  name                      = "payment-dlq"
  message_retention_seconds = 1209600
}
```

### Deployment en Kubernetes

**Manifiesto de Deployment (`kubernetes/deployment.yaml`):**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: payment
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  
  selector:
    matchLabels:
      app: payment-service
  
  template:
    metadata:
      labels:
        app: payment-service
        version: v1
    spec:
      serviceAccountName: payment-service
      
      containers:
      - name: api
        image: 123456789.dkr.ecr.us-east-1.amazonaws.com/payment-service:latest
        imagePullPolicy: Always
        
        ports:
        - name: http
          containerPort: 3000
          protocol: TCP
        
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: LOG_LEVEL
          value: "info"
        
        - name: DB_HOST
          valueFrom:
            configMapKeyRef:
              name: payment-config
              key: db_host
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: payment-secrets
              key: db_password
        
        - name: AWS_REGION
          value: "us-east-1"
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: payment-secrets
              key: aws_access_key
        
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 500m
            memory: 1Gi
        
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1000

---
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: payment
spec:
  type: LoadBalancer
  selector:
    app: payment-service
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: payment-service-hpa
  namespace: payment
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: payment-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Monitoreo y Observabilidad

**Integración CloudWatch:**

```typescript
// src/infrastructure/monitoring/cloudwatch.service.ts
export class CloudWatchService {
  async publishMetric(metricName: string, value: number, unit: string) {
    const cloudwatch = AWSConfig.getCloudWatchClient();
    
    await cloudwatch.putMetricData({
      Namespace: 'PaymentService',
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: [
          { Name: 'Environment', Value: process.env.NODE_ENV },
        ],
      }],
    }).promise();
  }
}
```

**Métricas Prometheus:**

```typescript
import { register, Counter, Histogram } from 'prom-client';

export const paymentCounter = new Counter({
  name: 'payments_total',
  help: 'Número total de pagos',
  labelNames: ['status'],
});

export const paymentDuration = new Histogram({
  name: 'payment_duration_seconds',
  help: 'Duración de procesamiento de pago',
  buckets: [0.1, 0.5, 1, 2, 5],
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
});
```

---

## Documentación de API

### URL Base

```
https://api.payment-service.example.com/v1
```

### Autenticación

```
Authorization: Bearer <JWT_TOKEN>
X-Request-ID: <UUID>
X-Correlation-ID: <UUID>
```

### Endpoints

**POST /payments**
- Crear transacción de pago
- Rate limit: 100/min por usuario
- Retorna: PaymentResponseDto

**GET /payments/{transactionId}**
- Recuperar estado de pago
- Rate limit: 200/min por usuario
- Retorna: PaymentStatusResponseDto

**GET /wallets/{walletId}/balance**
- Obtener saldo de billetera
- Retorna: WalletBalanceResponseDto

**Verificaciones de Salud**

```
GET /health       # Salud de aplicación
GET /ready        # Sonda de disponibilidad
GET /live         # Sonda de vida
```

---

## Consideraciones de Seguridad

### Autenticación y Autorización
[OK] Autenticación basada en JWT con expiración de 24 horas

[OK] Control de acceso basado en roles (ADMIN, USER, SERVICE)

[OK] Mecanismo de renovación de tokens

[OK] Polí­tica de rotación de claves API

### Protección de Datos

[OK] TLS 1.3 para todo transporte

[OK] Encriptación en reposo (RDS, DynamoDB)

[OK] Encriptación en tránsito (SQS)

[OK] Enmascaramiento de datos sensibles en logs

### Rate Limiting y Protección DDoS

[OK] Algoritmo token bucket (100 req/min por usuario)

[OK] Reglas WAF de CloudFront

[OK] Lí­mites de tamaño de solicitud (10MB)

[OK] Lí­mites de pool de conexiones

### Auditorí­a y Cumplimiento

[OK] Claves de idempotencia para rastreo de transacciones

[OK] Logging centralizado (CloudWatch)

[OK] Auditorí­a de operaciones sensibles

[OK] Cumplimiento PCI-DSS para datos de pago

---

## Monitoreo y Logging

### Niveles de Log

```
ERROR   - Fallos crí­ticos que requieren acción inmediata
WARN    - Condiciones de advertencia
INFO    - Mensajes informativos generales
DEBUG   - Información detallada de depuración
```

### Métricas Clave a Monitorear

```
- Latencia de solicitudes (p50, p95, p99)
- Tasa de errores por tipo
- Utilización del pool de conexiones de BD
- Profundidad de cola (SQS)
- Tasa de éxito de procesamiento de pagos
- Tasa de aciertos de caché de idempotencia
- Tiempos de respuesta de servicios externos
```

### Alertas

**Crí­ticas (activador de PagerDuty):**

- Tasa de errores > 1%
- Base de datos no disponible
- Profundidad de cola SQS > 10,000
- Tasa de éxito de pagos < 95%

**Advertencia (Email):**

- Tasa de errores > 0.5%
- Latencia de API p99 > 1s
- CPU de base de datos > 80%

---

## Solución de Problemas

### Problemas Comunes

**1. Timeout de Conexión de Base de Datos**

```
Error: connect ECONNREFUSED 127.0.0.1:5432

Solución:
- Verificar variables de entorno DB_HOST, DB_PORT
- Verificar que PostgreSQL está ejecutándose
- Verificar que los grupos de seguridad permiten conexión
- Monitorear: endpoint de verificación de salud de BD
```

**2. Timeout de Visibilidad de Mensaje SQS**

```
Error: ReceiveMessage timeout

Solución:
- Aumentar visibility_timeout_seconds
- Reducir tiempo de procesamiento en handlers
- Verificar CloudWatch por retrasos de procesamiento
```

**3. Throttling de DynamoDB**

```
Error: ProvisionedThroughputExceededException

Solución:
- Habilitar modo de facturación bajo demanda (ya hecho)
- Verificar particiones calientes (distribución de clave hash)
- Monitorear capacidad consumida
```

**4. Rate Limiting Demasiado Agresivo**

```
Respuesta: 429 Too Many Requests

Solución:
- Ajustar variable de entorno RATE_LIMIT_REQUESTS
- Usar RateLimitMiddleware.userKeyGenerator para lí­mites por usuario
- Verificar lógica de reintento del cliente
```

---

## Contribuir

### Estilo de Código

```bash
# Formatear código
npm run format

# Lint
npm run lint

# Corregir problemas de lint
npm run lint:fix
```

### Antes de Hacer Push

```bash
# Ejecutar todas las verificaciones
npm run pre-push

# Esto ejecuta:
# 1. npm run lint
# 2. npm run build
# 3. npm run test:unit
# 4. npm run test:integration
```

### Convención de Commits

```
feat(payment): agregar funcionalidad de reembolso
fix(auth): manejar tokens expirados correctamente
docs(api): actualizar documentación de endpoint de pago
style(code): reformatear servicio de idempotencia
test(handlers): agregar pruebas de manejador de consulta de transacción
chore(deps): actualizar nestjs a 10.2.0
```

---

## Soporte y Contacto

- Problemas: GitHub Issues
- Documentación: /docs
- Oncall: Ver wiki para cronograma de rotación

---

## Licencia

Licencia MIT - Ver archivo LICENSE

---

última Actualización: 17 de Diciembre de 2025
Mantenedor: Backend Platform Team
Estado: Listo para Producción
