import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface PubSubMessage {
  event: string;
  operationId: string;
  payload: unknown;
  targetUserId?: string;
}

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private subscriber!: Redis;
  private readonly listeners = new Map<string, Array<(msg: PubSubMessage) => void>>();

  constructor(
    @Inject('REDIS_CLIENT') private readonly publisher: Redis,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const cfg = this.configService.get('redis');
    this.subscriber = new Redis({
      host: cfg.host,
      port: cfg.port,
      username: cfg.username,
      password: cfg.password || undefined,
      db: cfg.db,
      retryStrategy: (t) => Math.min(t * 50, 2000),
    });

    this.subscriber.on('message', (channel: string, raw: string) => {
      try {
        const msg = JSON.parse(raw) as PubSubMessage;
        const handlers = this.listeners.get(channel) ?? [];
        for (const h of handlers) {
          try { h(msg); } catch (e) {
            this.logger.error(`PubSub listener error on ${channel}`, e);
          }
        }
      } catch {
        this.logger.warn(`Malformed PubSub message on ${channel}`);
      }
    });

    this.subscriber.on('error', (err) => this.logger.error('Redis subscriber error', err));
    this.logger.log('Redis PubSub service initialised');
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
  }

  async publish(channel: string, message: PubSubMessage): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, handler: (msg: PubSubMessage) => void): Promise<void> {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, []);
      await this.subscriber.subscribe(channel);
      this.logger.debug(`Subscribed to Redis channel: ${channel}`);
    }
    this.listeners.get(channel)!.push(handler);
  }
}
