/**
 * DynamoDB Idempotency Repository - Stores idempotency records with TTL
 */

import { DynamoDB } from 'aws-sdk';
import { createLogger } from '../config/logging.config';
import { IdempotencyRecord } from '../../domain/services/idempotency-checker.service';

const log = createLogger('DynamoDBIdempotencyRepository');

/**
 * DynamoDB Idempotency Repository Interface
 */
export interface IIdempotencyRepository {
  findByKey(key: string): Promise<IdempotencyRecord | null>;
  save(record: IdempotencyRecord): Promise<void>;
  delete(key: string): Promise<void>;
  deleteExpired(cutoffDate: Date): Promise<number>;
}

/**
 * DynamoDB Idempotency Repository
 * Implements TTL-based cleanup for idempotency records
 */
export class DynamoDBIdempotencyRepository implements IIdempotencyRepository {
  private dynamodb: DynamoDB.DocumentClient;
  private tableName: string;

  constructor(tableName: string, region: string) {
    this.tableName = tableName;
    this.dynamodb = new DynamoDB.DocumentClient({ region });
  }

  /**
   * Find idempotency record by key
   */
  async findByKey(key: string): Promise<IdempotencyRecord | null> {
    try {
      log.debug(`Finding idempotency record for key: ${key}`);

      const result = await this.dynamodb
        .get({
          TableName: this.tableName,
          Key: { idempotencyKey: key },
        })
        .promise();

      if (!result.Item) {
        log.debug(`Idempotency record not found for key: ${key}`);
        return null;
      }

      const record = result.Item as IdempotencyRecord;

      log.debug(`Found idempotency record`, {
        key,
        status: record.status,
      });

      return record;
    } catch (error) {
      log.error(`Failed to find idempotency record`, error);
      throw error;
    }
  }

  /**
   * Save idempotency record
   */
  async save(record: IdempotencyRecord): Promise<void> {
    try {
      const ttl = Math.floor(record.expiresAt.getTime() / 1000);

      log.debug(`Saving idempotency record`, {
        key: record.idempotencyKey,
        status: record.status,
      });

      await this.dynamodb
        .put({
          TableName: this.tableName,
          Item: {
            idempotencyKey: record.idempotencyKey,
            transactionId: record.transactionId.toString(),
            status: record.status,
            result: record.result,
            error: record.error,
            createdAt: record.createdAt.toISOString(),
            expiresAt: record.expiresAt.toISOString(),
            ttl,
          },
        })
        .promise();

      log.info(`Idempotency record saved`, {
        key: record.idempotencyKey,
        ttl,
      });
    } catch (error) {
      log.error(`Failed to save idempotency record`, error);
      throw error;
    }
  }

  /**
   * Delete idempotency record
   */
  async delete(key: string): Promise<void> {
    try {
      log.debug(`Deleting idempotency record for key: ${key}`);

      await this.dynamodb
        .delete({
          TableName: this.tableName,
          Key: { idempotencyKey: key },
        })
        .promise();

      log.info(`Idempotency record deleted`, { key });
    } catch (error) {
      log.error(`Failed to delete idempotency record`, error);
      throw error;
    }
  }

  /**
   * Delete all expired records before cutoff date
   */
  async deleteExpired(cutoffDate: Date): Promise<number> {
    try {
      const cutoffISO = cutoffDate.toISOString();

      log.debug(`Deleting expired records before ${cutoffISO}`);

      const queryParams = {
        TableName: this.tableName,
        IndexName: 'expiresAt-index',
        KeyConditionExpression: 'expiresAt <= :cutoff',
        ExpressionAttributeValues: {
          ':cutoff': cutoffISO,
        },
        ProjectionExpression: 'idempotencyKey',
      };

      const items = await this.queryAll(queryParams);

      if (items.length === 0) {
        log.debug('No expired records found');
        return 0;
      }

      let deletedCount = 0;

      for (const item of items) {
        try {
          await this.delete(item.idempotencyKey);
          deletedCount++;
        } catch (error) {
          log.warn(`Failed to delete expired record`, {
            key: item.idempotencyKey,
            error,
          });
        }
      }

      log.info(`Expired records cleanup completed`, {
        deletedCount,
        cutoffDate: cutoffISO,
      });

      return deletedCount;
    } catch (error) {
      log.error(`Failed to cleanup expired records`, error);
      throw error;
    }
  }

  /**
   * Query all items (handles pagination)
   */
  private async queryAll(params: DynamoDB.DocumentClient.QueryInput): Promise<any[]> {
    const allItems: any[] = [];
    let lastEvaluatedKey: any = undefined;

    do {
      const response = await this.dynamodb.query({ ...params, ExclusiveStartKey: lastEvaluatedKey }).promise();

      allItems.push(...(response.Items || []));
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allItems;
  }

  /**
   * Create table if it doesn't exist
   */
  async createTableIfNotExists(): Promise<void> {
    const dynamodb = new DynamoDB({ region: 'us-east-1' });

    try {
      log.info(`Creating DynamoDB table if not exists: ${this.tableName}`);

      const params: DynamoDB.CreateTableInput = {
        TableName: this.tableName,
        KeySchema: [
          { AttributeName: 'idempotencyKey', KeyType: 'HASH' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'idempotencyKey', AttributeType: 'S' },
          { AttributeName: 'expiresAt', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'expiresAt-index',
            KeySchema: [
              { AttributeName: 'expiresAt', KeyType: 'HASH' },
            ],
            Projection: { ProjectionType: 'KEYS_ONLY' },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          },
        ],
        BillingMode: 'PAY_PER_REQUEST',
        StreamSpecification: {
          StreamViewType: 'NEW_AND_OLD_IMAGES',
        },
        TimeToLiveSpecification: {
          Enabled: true,
          AttributeName: 'ttl',
        },
      };

      await dynamodb.createTable(params).promise();

      log.info(`DynamoDB table created: ${this.tableName}`);
    } catch (error: any) {
      if (error.code === 'ResourceInUseException') {
        log.debug(`Table already exists: ${this.tableName}`);
      } else {
        log.error('Failed to create DynamoDB table', error);
        throw error;
      }
    }
  }

  /**
   * Get table status
   */
  async getTableStatus(): Promise<string> {
    const dynamodb = new DynamoDB({ region: 'us-east-1' });

    try {
      const result = await dynamodb.describeTable({ TableName: this.tableName }).promise();
      return result.Table?.TableStatus || 'UNKNOWN';
    } catch (error) {
      log.error('Failed to get table status', error);
      throw error;
    }
  }
}