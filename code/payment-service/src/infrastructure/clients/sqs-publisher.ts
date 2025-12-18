/**
 * SQS Publisher - Publishes domain events to SQS queue
 */

import { SQS } from 'aws-sdk';

/**
 * Event message structure
 */
export interface EventMessage {
  eventType: string;
  aggregateId?: string;
  payload: any;
  timestamp: string;
  version?: number;
}

/**
 * SQS Publisher Configuration
 */
export interface SQSPublisherConfig {
  queueUrl: string;
  region: string;
}

/**
 * SQS Publisher
 * Handles publishing domain events to AWS SQS queue
 */
export class SQSPublisher {
  private sqs: SQS;
  private config: SQSPublisherConfig;

  constructor(config: SQSPublisherConfig) {
    this.config = config;
    this.sqs = new SQS({ region: config.region });
  }

  /**
   * Publish single event to SQS
   */
  async publishEvent(
    eventType: string,
    payload: any,
    delaySeconds: number = 0,
  ): Promise<string> {
    try {
      const message: EventMessage = {
        eventType,
        payload,
        timestamp: new Date().toISOString(),
      };

      const messageBody = JSON.stringify(message);

      const params: SQS.SendMessageRequest = {
        QueueUrl: this.config.queueUrl,
        MessageBody: messageBody,
        MessageAttributes: {
          EventType: {
            StringValue: eventType,
            DataType: 'String',
          },
          Timestamp: {
            StringValue: new Date().toISOString(),
            DataType: 'String',
          },
        },
        DelaySeconds: delaySeconds,
      };

      const result = await this.sqs.sendMessage(params).promise();

      return result.MessageId!;
    } catch (error) {
      throw new Error(`SQS publish failed: ${(error as Error).message}`);
    }
  }

  /**
   * Publish batch of events to SQS
   */
  async publishBatch(
    messages: Array<{ eventType: string; payload: any; delaySeconds?: number }>,
  ): Promise<string[]> {
    if (messages.length === 0) {
      return [];
    }

    if (messages.length > 10) {
      throw new Error('Batch size cannot exceed 10 messages');
    }

    try {
      const entries: SQS.SendMessageBatchRequestEntry[] = messages.map((msg, index) => ({
        Id: String(index),
        MessageBody: JSON.stringify({
          eventType: msg.eventType,
          payload: msg.payload,
          timestamp: new Date().toISOString(),
        }),
        MessageAttributes: {
          EventType: {
            StringValue: msg.eventType,
            DataType: 'String',
          },
          Timestamp: {
            StringValue: new Date().toISOString(),
            DataType: 'String',
          },
        },
        DelaySeconds: msg.delaySeconds || 0,
      }));

      const params: SQS.SendMessageBatchRequest = {
        QueueUrl: this.config.queueUrl,
        Entries: entries,
      };

      const result = await this.sqs.sendMessageBatch(params).promise();

      return result.Successful?.map(s => s.MessageId!).filter(Boolean) || [];
    } catch (error) {
      throw new Error(`SQS batch publish failed: ${(error as Error).message}`);
    }
  }

  /**
   * Enviar mensaje con propiedades de evento específicasEnviar mensaje con propiedades de evento específicas
   */
  async sendEvent(
    eventType: string,
    aggregateId: string,
    payload: any,
    version: number = 1,
  ): Promise<string> {
    const message = {
      eventType,
      aggregateId,
      payload,
      timestamp: new Date().toISOString(),
      version,
    };

    const messageBody = JSON.stringify(message);

    try {
      const params: SQS.SendMessageRequest = {
        QueueUrl: this.config.queueUrl,
        MessageBody: messageBody,
        MessageAttributes: {
          EventType: {
            StringValue: eventType,
            DataType: 'String',
          },
          AggregateId: {
            StringValue: aggregateId,
            DataType: 'String',
          },
          Version: {
            StringValue: String(version),
            DataType: 'Number',
          },
        },
      };

      const result = await this.sqs.sendMessage(params).promise();

      return result.MessageId!;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get approximate message count
   */
  async getApproximateMessageCount(): Promise<number> {
    try {
      const result = await this.sqs
        .getQueueAttributes({
          QueueUrl: this.config.queueUrl,
          AttributeNames: ['ApproximateNumberOfMessages'],
        })
        .promise();

      const count = result.Attributes?.ApproximateNumberOfMessages;
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get queue URL
   */
  getQueueUrl(): string {
    return this.config.queueUrl;
  }

  /**
   * Get region
   */
  getRegion(): string {
    return this.config.region;
  }
}// sqs-publisher
