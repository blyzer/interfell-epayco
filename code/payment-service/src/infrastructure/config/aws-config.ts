/**
 * AWS Configuration - Central AWS SDK setup
 */

import * as AWS from 'aws-sdk';

/**
 * Environment variables - Must be defined
 */
const {
  AWS_REGION = 'us-east-1',
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  NODE_ENV = 'development',
} = process.env;

/**
 * AWS Configuration Manager
 * Centralizes AWS SDK setup, credentials, and service initialization
 */
export class AWSConfig {
  private static isConfigured = false;

  /**
   * Initialize and configure AWS SDK
   */
  static configure(): void {
    if (this.isConfigured) {
      console.debug('AWS already configured');
      return;
    }

    try {
      AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
        maxRetries: 3,
        httpOptions: {
          timeout: 30000,
          connectTimeout: 5000,
        },
      });

      this.isConfigured = true;

      console.info('AWS configured successfully', {
        region: AWS_REGION,
        environment: NODE_ENV,
      });
    } catch (error) {
      console.error('Failed to configure AWS', error);
      throw new Error(`AWS configuration failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get S3 client
   */
  static getS3Client(): AWS.S3 {
    return new AWS.S3({
      region: AWS_REGION,
    });
  }

  /**
   * Get SQS client
   */
  static getSQSClient(): AWS.SQS {
    return new AWS.SQS({
      region: AWS_REGION,
    });
  }

  /**
   * Get SNS client
   */
  static getSNSClient(): AWS.SNS {
    return new AWS.SNS({
      region: AWS_REGION,
    });
  }

  /**
   * Get DynamoDB client
   */
  static getDynamoDBClient(): AWS.DynamoDB {
    return new AWS.DynamoDB({
      region: AWS_REGION,
    });
  }

  /**
   * Get DynamoDB Document client
   */
  static getDynamoDBDocumentClient(): AWS.DynamoDB.DocumentClient {
    return new AWS.DynamoDB.DocumentClient({
      region: AWS_REGION,
    });
  }

  /**
   * Get Secrets Manager client
   */
  static getSecretsManagerClient(): AWS.SecretsManager {
    return new AWS.SecretsManager({
      region: AWS_REGION,
    });
  }

  /**
   * Get Lambda client
   */
  static getLambdaClient(): AWS.Lambda {
    return new AWS.Lambda({
      region: AWS_REGION,
    });
  }

  /**
   * Get CloudWatch client
   */
  static getCloudWatchClient(): AWS.CloudWatch {
    return new AWS.CloudWatch({
      region: AWS_REGION,
    });
  }

  /**
   * Retrieve secret value from Secrets Manager
   */
  static async getSecretValue(secretName: string): Promise<string> {
    const secretsManager = this.getSecretsManagerClient();

    try {
      console.debug(`Retrieving secret: ${secretName}`);

      const response = await secretsManager.getSecretValue({ SecretId: secretName }).promise();

      if ('SecretString' in response) {
        return response.SecretString as string;
      }

      const secretBinary = response.SecretBinary;
      return Buffer.from(secretBinary as string, 'base64').toString('ascii');
    } catch (error) {
      console.error(`Failed to retrieve secret: ${secretName}`, error);
      throw new Error(`Secret retrieval failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get current AWS region
   */
  static getRegion(): string {
    return AWS_REGION;
  }

  /**
   * Get current environment
   */
  static getEnvironment(): string {
    return NODE_ENV;
  }

  /**
   * Check if running in production
   */
  static isProduction(): boolean {
    return NODE_ENV === 'production';
  }

  /**
   * Verify AWS configuration is valid
   */
  static async verify(): Promise<boolean> {
    try {
      const sts = new AWS.STS({ region: AWS_REGION });
      await sts.getCallerIdentity().promise();

      console.info('AWS configuration verified');
      return true;
    } catch (error) {
      console.error('AWS configuration verification failed', error);
      return false;
    }
  }
}