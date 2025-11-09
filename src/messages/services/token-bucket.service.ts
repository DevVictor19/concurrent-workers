import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { createLock, Lock, NodeRedisAdapter } from 'redlock-universal';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenBucketService implements OnModuleInit {
  private readonly logger = new Logger(TokenBucketService.name);
  private readonly redisClient: RedisClientType;
  private readonly lockManager: Lock;
  private readonly apiTokens: string[];
  private readonly tokenRequestLimitMs: number;

  constructor(configService: ConfigService) {
    this.redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    });

    this.lockManager = createLock({
      adapter: new NodeRedisAdapter(this.redisClient),
      key: 'lock:token_bucket',
      ttl: 3000,
      retryAttempts: 3,
      retryDelay: 200,
    });

    this.apiTokens = configService.getOrThrow<string>('API_TOKENS').split(',');
    this.tokenRequestLimitMs = Number(
      configService.getOrThrow<string>('TOKEN_REQUEST_LIMIT_MS'),
    );
  }

  public async onModuleInit(): Promise<void> {
    try {
      await this.redisClient.connect();
      this.logger.log('Connected to Redis successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
    }

    try {
      await this.initializeBucket();
      this.logger.log('Token bucket initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize token bucket', error);
    }
  }

  public async getAvailableToken(): Promise<string | null> {
    try {
      const lock = await this.lockManager.acquire();

      for (const token of this.apiTokens) {
        const bucketKey = this.getBucketKey();
        const availableAt = await this.redisClient.hGet(bucketKey, token);
        const now = Date.now();

        if (!availableAt || now >= Number(availableAt)) {
          const updatedAvailableAt = (
            now + this.tokenRequestLimitMs
          ).toString();

          await this.redisClient.hSet(bucketKey, token, updatedAvailableAt);

          await this.lockManager.release(lock);

          return token;
        }
      }

      await this.lockManager.release(lock);

      return null;
    } catch (error) {
      this.logger.error('Error acquiring token', error);
      return null;
    }
  }

  private async initializeBucket(): Promise<void> {
    const bucketKey = this.getBucketKey();

    for (const token of this.apiTokens) {
      const now = Date.now();

      const wasSet = await this.redisClient.hSetNX(
        bucketKey,
        token,
        now.toString(),
      );

      if (wasSet === 1) {
        this.logger.debug(`Token ${token} initialized with availableAt ${now}`);
      } else {
        this.logger.debug(`Token ${token} already exists, skipping`);
      }
    }
  }

  private getBucketKey(): string {
    return 'token_bucket';
  }
}
