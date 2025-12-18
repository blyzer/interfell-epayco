/**
 * PostgreSQL Connection - Database initialization and management
 */

import { Client, Pool, QueryResult } from 'pg';
import { createLogger } from '../config/logging.config';

const log = createLogger('PostgreSQL');

/**
 * Connection config interface
 */
export interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * PostgreSQL Connection Manager
 * Handles connection pooling and query execution
 */
export class PostgresConnection {
  private pool: Pool;
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this.config = config;

    this.pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      max: 20,
      min: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
    });

    this.pool.on('error', (err) => {
      log.error('Unexpected error on idle client', err);
    });

    this.pool.on('connect', () => {
      log.debug('Client connected to database');
    });

    this.pool.on('remove', () => {
      log.debug('Client removed from pool');
    });
  }

  /**
   * Initialize connection pool
   */
  async initialize(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      log.info('PostgreSQL connection pool initialized', {
        host: this.config.host,
        database: this.config.database,
        poolSize: this.pool.totalCount,
      });
    } catch (error) {
      log.error('Failed to initialize PostgreSQL connection', error);
      throw error;
    }
  }

  /**
   * Execute query
   */
  async query<T = any>(text: string, values?: any[]): Promise<QueryResult<T>> {
    const startTime = Date.now();

    try {
      log.debug('Executing query', { query: text.substring(0, 100) });

      const result = await this.pool.query<T>(text, values);
      const duration = Date.now() - startTime;

      log.debug('Query executed', {
        rowCount: result.rowCount,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      log.error('Query execution failed', {
        query: text.substring(0, 100),
        duration: `${duration}ms`,
        error,
      });

      throw error;
    }
  }

  /**
   * Execute transaction
   */
  async transaction<T>(callback: (client: Client) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    const startTime = Date.now();

    try {
      await client.query('BEGIN');
      log.debug('Transaction started');

      const result = await callback(client);

      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      log.info('Transaction committed', { duration: `${duration}ms` });

      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
        log.debug('Transaction rolled back');
      } catch (rollbackError) {
        log.error('Rollback failed', rollbackError);
      }

      const duration = Date.now() - startTime;
      log.error('Transaction failed', {
        duration: `${duration}ms`,
        error,
      });

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get raw client from pool
   */
  async getClient(): Promise<Client> {
    try {
      return await this.pool.connect();
    } catch (error) {
      log.error('Failed to get client from pool', error);
      throw error;
    }
  }

  /**
   * Execute batch insert
   */
  async batchInsert(
    table: string,
    columns: string[],
    rows: any[][],
  ): Promise<QueryResult> {
    if (rows.length === 0) {
      throw new Error('No rows to insert');
    }

    try {
      const placeholders = rows
        .map((_, i) => {
          const colPlaceholders = columns
            .map((_, j) => `$${i * columns.length + j + 1}`)
            .join(',');
          return `(${colPlaceholders})`;
        })
        .join(',');

      const query = `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`;
      const values = rows.flat();

      log.debug(`Batch inserting ${rows.length} rows into ${table}`);

      const result = await this.pool.query(query, values);

      log.info(`Batch insert completed`, {
        table,
        rowCount: result.rowCount,
      });

      return result;
    } catch (error) {
      log.error(`Batch insert failed for ${table}`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      log.error('Health check failed', error);
      return false;
    }
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      log.info('PostgreSQL connection pool closed');
    } catch (error) {
      log.error('Error closing connection pool', error);
      throw error;
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStatus(): {
    totalConnections: number;
    idleConnections: number;
    waitingRequests: number;
  } {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingRequests: this.pool.waitingCount,
    };
  }

  /**
   * Get pool instance
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Get connection config
   */
  getConfig(): ConnectionConfig {
    return this.config;
  }
}