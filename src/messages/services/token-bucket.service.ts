import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';
import { randomUUID as uuidV4 } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';

@Injectable()
export class TokenBucketService implements OnModuleInit {
  private readonly logger = new Logger(TokenBucketService.name);
  private readonly redisClient: RedisClientType;
  private readonly apiTokens: string[];
  private readonly tokenRequestLimitMs: number;
  private readonly LOCK_TTL_MS = 5000;

  constructor(configService: ConfigService) {
    this.redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    });

    this.apiTokens = configService.getOrThrow<string>('API_TOKENS').split(',');
    this.tokenRequestLimitMs = configService.getOrThrow<number>(
      'TOKEN_REQUEST_LIMIT_MS',
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
    const clientLockId = await this.lock(200, 4);

    if (!clientLockId) {
      this.logger.error('Failed to acquire lock for token bucket');
      return null;
    }

    try {
      for (const token of this.apiTokens) {
        const bucketKey = this.getBucketKey();
        const availableAt = await this.redisClient.hGet(bucketKey, token);
        const now = Date.now();

        if (!availableAt || now >= Number(availableAt)) {
          const updatedAvailableAt = (
            now + this.tokenRequestLimitMs
          ).toString();

          await this.redisClient.hSet(bucketKey, token, updatedAvailableAt);

          return token;
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Error acquiring token', error);
      return null;
    } finally {
      await this.unlock(clientLockId);
    }
  }

  public getTokenRequestLimitMs(): number {
    return this.tokenRequestLimitMs;
  }

  private async lock(timeout: number, retries: number): Promise<string | null> {
    const lockKey = this.getLockKey();
    const clientLockId = uuidV4();

    const wasSet = await this.redisClient.set(lockKey, clientLockId, {
      NX: true,
      PX: this.LOCK_TTL_MS,
    });

    if (!wasSet) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        this.logger.debug(
          `Lock attempt ${attempt} failed, retrying in ${timeout}ms...`,
        );

        await setTimeout(timeout * attempt);

        const retrySet = await this.redisClient.set(lockKey, clientLockId, {
          NX: true,
          PX: this.LOCK_TTL_MS,
        });

        if (retrySet) {
          break;
        }
      }
      return null;
    }

    return clientLockId;
  }

  private async unlock(currentClientLockId: string): Promise<void> {
    const lockKey = this.getLockKey();
    const clientLockId = await this.redisClient.get(lockKey);

    if (clientLockId === currentClientLockId) {
      await this.redisClient.del(lockKey);
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

  private getLockKey(): string {
    return `lock:${this.getBucketKey()}`;
  }
}
