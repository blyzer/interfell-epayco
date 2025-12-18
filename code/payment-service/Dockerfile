# Multi-stage Docker build para optimizar tamaño

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Metadata
LABEL maintainer="payment-service@example.com"
LABEL description="Payment Service - DDD Microservicio"
LABEL version="1.0.0"

# Variables de entorno por defecto
ENV NODE_ENV=production \
    PORT=3000

# Crear usuario no-root por seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copiar node_modules desde builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar código compilado desde builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Switch a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Liveness probe script
COPY --chown=nodejs:nodejs scripts/liveness.js ./scripts/

# Comando de inicio
CMD ["node", "dist/main.js"]
