/**
 * SQS Command Publisher - Publishes commands to SQS for async processing
 */

import { SQS } from 'aws-sdk';

/**
 * Command message structure
 */
export interface CommandMessage {
  commandId: string;
  commandType: string;
  aggregateId: string;
  payload: any;
  timestamp: Date;
  version: number;
  userId?: string;
  correlationId?: string;
}

/**
 * SQS Command Publisher Configuration
 */
export interface SQSCommandPublisherConfig {
  commandQueueUrl: string;
  region: string;
  deadLetterQueueUrl?: string;
}

/**
 * SQS Command Publisher
 * Handles async command processing via SQS
 */
export class SQSCommandPublisher {
  private sqs: SQS;
  private config: SQSCommandPublisherConfig;

  constructor(config: SQSCommandPublisherConfig) {
    this.config = config;
    this.sqs = new SQS({ region: config.region });
  }

  /**
   * Publish single command to SQS
   */
  async publishCommand(command: CommandMessage, delaySeconds: number = 0): Promise<string> {
    try {
      const messageBody = JSON.stringify({
        ...command,
        timestamp: command.timestamp.toISOString(),
      });

      const params: SQS.SendMessageRequest = {
        QueueUrl: this.config.commandQueueUrl,
        MessageBody: messageBody,
        MessageAttributes: {
          CommandType: {
            StringValue: command.commandType,
            DataType: 'String',
          },
          AggregateId: {
            StringValue: command.aggregateId,
            DataType: 'String',
          },
          CommandId: {
            StringValue: command.commandId,
            DataType: 'String',
          },
          Version: {
            StringValue: String(command.version),
            DataType: 'Number',
          },
        },
        DelaySeconds: delaySeconds,
      };

      if (command.correlationId) {
        params.MessageAttributes!.CorrelationId = {
          StringValue: command.correlationId,
          DataType: 'String',
        };
      }

      const result = await this.sqs.sendMessage(params).promise();

      return result.MessageId!;
    } catch (error) {
      throw new Error(`SQS command publish failed: ${(error as Error).message}`);
    }
  }

  /**
   * Publish batch of commands to SQS
   */
  async publishCommandBatch(commands: CommandMessage[]): Promise<string[]> {
    if (commands.length === 0) {
      return [];
    }

    if (commands.length > 10) {
      throw new Error('Batch size cannot exceed 10 messages');
    }

    try {
      const entries: SQS.SendMessageBatchRequestEntry[] = commands.map((cmd, index) => ({
        Id: String(index),
        MessageBody: JSON.stringify({
          ...cmd,
          timestamp: cmd.timestamp.toISOString(),
        }),
        MessageAttributes: {
          CommandType: {
            StringValue: cmd.commandType,
            DataType: 'String',
          },
          AggregateId: {
            StringValue: cmd.aggregateId,
            DataType: 'String',
          },
          CommandId: {
            StringValue: cmd.commandId,
            DataType: 'String',
          },
          Version: {
            StringValue: String(cmd.version),
            DataType: 'Number',
          },
        },
      }));

      const params: SQS.SendMessageBatchRequest = {
        QueueUrl: this.config.commandQueueUrl,
        Entries: entries,
      };

      const result = await this.sqs.sendMessageBatch(params).promise();

      return result.Successful?.map(s => s.MessageId!).filter(Boolean) || [];
    } catch (error) {
      throw new Error(`SQS batch publish failed: ${(error as Error).message}`);
    }
  }

  /**
   * Publish command with dead-letter queue fallback
   */
  async publishWithDeadLetterRetry(
    command: CommandMessage,
    maxRetries: number = 3,
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.publishCommand(command);
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
        }
      }
    }

    if (this.config.deadLetterQueueUrl && lastError) {
      try {
        const dlqParams: SQS.SendMessageRequest = {
          QueueUrl: this.config.deadLetterQueueUrl,
          MessageBody: JSON.stringify({
            ...command,
            timestamp: command.timestamp.toISOString(),
            dlqReason: lastError.message,
            dlqTimestamp: new Date().toISOString(),
            dlqRetryCount: maxRetries,
          }),
        };

        const result = await this.sqs.sendMessage(dlqParams).promise();

        return result.MessageId!;
      } catch (dlqError) {
        throw new Error(
          `Failed to publish command and DLQ is unavailable: ${lastError.message}`,
        );
      }
    }

    throw lastError || new Error('Unknown error publishing command');
  }

  /**
   * Get approximate command count
   */
  async getApproximateCommandCount(): Promise<number> {
    try {
      const result = await this.sqs
        .getQueueAttributes({
          QueueUrl: this.config.commandQueueUrl,
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
   * Check if queue is healthy
   */
  async isQueueHealthy(): Promise<boolean> {
    try {
      await this.getApproximateCommandCount();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get command queue URL
   */
  getCommandQueueUrl(): string {
    return this.config.commandQueueUrl;
  }

  /**
   * Get dead-letter queue URL if configured
   */
  getDeadLetterQueueUrl(): string | undefined {
    return this.config.deadLetterQueueUrl;
  }

  /**
   * Get region
   */
  getRegion(): string {
    return this.config.region;
  }
}