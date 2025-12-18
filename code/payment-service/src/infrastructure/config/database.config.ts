/**
 * Database Configuration - PostgreSQL connection pooling setup
 */

import { Pool, Client, QueryResult } from 'pg';

/**
 * Environment variables - Must be defined
 */
const {
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_USER = 'postgres',
  DB_PASSWORD = '',
  DB_NAME = 'payment_service',
  DB_SSL = 'false',
  DB_POOL_MIN = '5',
  DB_POOL_MAX = '20',
} = process.env;

/**
 * Database Configuration Manager
 * Manages PostgreSQL connection pooling and queries
 */
export class DatabaseConfig {
  private static pool: Pool;
  private static isInitialized = false;

  /**
   * Initialize database connection pool
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.debug('Database already initialized');
      return;
    }

    try {
      this.pool = new Pool({
        host: DB_HOST,
        port: parseInt(DB_PORT, 10),
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        max: parseInt(DB_POOL_MAX, 10),
        min: parseInt(DB_POOL_MIN, 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        application_name: 'payment-service',
        statement_timeout: 30000,
      });

      this.pool.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err);
      });

      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isInitialized = true;

      console.info('Database connection pool established', {
        host: DB_HOST,
        database: DB_NAME,
        minConnections: DB_POOL_MIN,
        maxConnections: DB_POOL_MAX,
      });
    } catch (error) {
      console.error('Failed to initialize database pool', error);
      throw new Error(`Database initialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Execute query with optional parameters
   */
  static async query<T = any>(text: string, values?: any[]): Promise<QueryResult<T>> {
    if (!this.isInitialized) {
      throw new Error('Database pool not initialized');
    }

    try {
      console.debug('Executing query', { query: text.substring(0, 100) });

      const result = await this.pool.query<T>(text, values);

      console.debug('Query executed', { rowCount: result.rowCount });

      return result;
    } catch (error) {
      console.error('Query execution failed', {
        query: text.substring(0, 100),
        error,
      });
      throw error;
    }
  }

  /**
   * Execute transaction
   */
  static async transaction<T>(
    callback: (client: Client) => Promise<T>,
  ): Promise<T> {
    if (!this.isInitialized) {
      throw new Error('Database pool not initialized');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      console.debug('Transaction started');

      const result = await callback(client);

      await client.query('COMMIT');

      console.debug('Transaction committed');

      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
        console.debug('Transaction rolled back');
      } catch (rollbackError) {
        console.error('Rollback failed', rollbackError);
      }

      console.error('Transaction failed', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get raw client from pool
   */
  static async getClient(): Promise<Client> {
    if (!this.isInitialized) {
      throw new Error('Database pool not initialized');
    }

    try {
      return await this.pool.connect();
    } catch (error) {
      console.error('Failed to get client from pool', error);
      throw error;
    }
  }

  /**
   * Close connection pool
   */
  static async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        this.isInitialized = false;
        console.info('Database connection pool closed');
      } catch (error) {
        console.error('Error closing database pool', error);
        throw error;
      }
    }
  }

  /**
   * Get pool instance
   */
  static getPool(): Pool {
    if (!this.isInitialized) {
      throw new Error('Database pool not initialized');
    }
    return this.pool;
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database health check failed', error);
      return false;
    }
  }

  /**
   * Get pool statistics
   */
  static getPoolStatus(): {
    isInitialized: boolean;
    totalConnections: number;
    idleConnections: number;
    waitingRequests: number;
  } {
    if (!this.isInitialized) {
      return {
        isInitialized: false,
        totalConnections: 0,
        idleConnections: 0,
        waitingRequests: 0,
      };
    }

    return {
      isInitialized: true,
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingRequests: this.pool.waitingCount,
    };
  }

  /**
   * Execute batch insert
   */
  static async batchInsert(
    table: string,
    columns: string[],
    rows: any[][],
  ): Promise<QueryResult> {
    if (!this.isInitialized) {
      throw new Error('Database pool not initialized');
    }

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

      console.debug(`Batch inserting ${rows.length} rows into ${table}`);

      const result = await this.pool.query(query, values);

      console.info(`Batch insert completed`, {
        table,
        rowCount: result.rowCount,
      });

      return result;
    } catch (error) {
      console.error(`Batch insert failed for ${table}`, error);
      throw error;
    }
  }

  /**
   * Get database info
   */
  static getDatabaseInfo(): {
    host: string;
    port: number;
    database: string;
    user: string;
    ssl: boolean;
  } {
    return {
      host: DB_HOST,
      port: parseInt(DB_PORT, 10),
      database: DB_NAME,
      user: DB_USER,
      ssl: DB_SSL === 'true',
    };
  }
}