/**
 * SNSEventPublisher - Event Publishing
 * 
 * Publica eventos de dominio a AWS SNS para consumidores asíncrónos.
 * Implementa el patrón Event-Driven Architecture.
 * 
 * Consumidores posibles:
 * - Auditoría (logging)
 * - Analytics
 * - Notificaciones
 * - Sincronización con otros servicios
 */

import * as AWS from 'aws-sdk';

export interface IEventPublisher {
  publish(events: any[]): Promise<void>;
}

export class SNSEventPublisher implements IEventPublisher {
  private sns: AWS.SNS;
  private readonly topicArn: string;

  constructor(topicArn: string, region: string = 'us-east-1') {
    this.topicArn = topicArn;
    this.sns = new AWS.SNS({ region });
  }

  /**
   * Publica eventos a SNS
   * Cada evento es un mensaje independiente
   */
  async publish(events: any[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const promises = events.map(event => this.publishSingleEvent(event));

    try {
      await Promise.all(promises);
      console.log(`[SNSPublisher] ✓ ${events.length} eventos publicados a SNS`);
    } catch (error) {
      console.error('[SNSPublisher] Error publicando eventos:', error);
      throw error;
    }
  }

  /**
   * Publica un evento individual
   */
  private async publishSingleEvent(event: any): Promise<void> {
    const eventData = event.toJSON?.() || event;

    const params = {
      TopicArn: this.topicArn,
      Subject: `Payment Event: ${eventData.eventType}`,
      Message: JSON.stringify(eventData, null, 2),
      MessageAttributes: {
        eventType: {
          StringValue: eventData.eventType,
          DataType: 'String'
        },
        aggregateId: {
          StringValue: eventData.aggregateId,
          DataType: 'String'
        },
        occurredAt: {
          StringValue: eventData.occurredAt,
          DataType: 'String'
        }
      }
    };

    return new Promise((resolve, reject) => {
      this.sns.publish(params, (err, data) => {
        if (err) {
          console.error(
            `[SNSPublisher] Error publicando ${eventData.eventType}:`,
            err
          );
          reject(err);
        } else {
          console.log(
            `[SNSPublisher] ✓ ${eventData.eventType} publicado`,
            `MessageId=${data.MessageId}`
          );
          resolve();
        }
      });
    });
  }
}

/**
 * SQSEventPublisher - Alternativa a SNS
 * 
 * Publica eventos a AWS SQS (menos escalable pero más simple).
 * Útil para debugging o si ya tienes SQS setup.
 */
export class SQSEventPublisher implements IEventPublisher {
  private sqs: AWS.SQS;
  private readonly queueUrl: string;

  constructor(queueUrl: string, region: string = 'us-east-1') {
    this.queueUrl = queueUrl;
    this.sqs = new AWS.SQS({ region });
  }

  async publish(events: any[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    const promises = events.map(event => this.publishToSQS(event));

    try {
      await Promise.all(promises);
      console.log(`[SQSPublisher] ✓ ${events.length} eventos publicados a SQS`);
    } catch (error) {
      console.error('[SQSPublisher] Error publicando eventos:', error);
      throw error;
    }
  }

  private async publishToSQS(event: any): Promise<void> {
    const eventData = event.toJSON?.() || event;

    const params = {
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(eventData),
      MessageAttributes: {
        eventType: {
          StringValue: eventData.eventType,
          DataType: 'String'
        }
      }
    };

    return new Promise((resolve, reject) => {
      this.sqs.sendMessage(params, (err, data) => {
        if (err) {
          console.error('[SQSPublisher] Error:', err);
          reject(err);
        } else {
          console.log(
            `[SQSPublisher] ✓ ${eventData.eventType} encolado`,
            `MessageId=${data.MessageId}`
          );
          resolve();
        }
      });
    });
  }
}
