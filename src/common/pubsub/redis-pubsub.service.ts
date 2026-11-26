import { Inject, Injectable, OnApplicationShutdown, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface PubSubMessage {
  event: string;
  operationId: string;
  payload: unknown;
  targetUserId?: string;
}

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown {
  private subscriber!: Redis;
  private readonly listeners = new Map<string, Array<(msg: PubSubMessage) => void>>();
  private redisShutdown = false;

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
            console.error(`PubSub listener error on ${channel}`, e);
          }
        }
      } catch {
        console.warn(`Malformed PubSub message on ${channel}`);
      }
    });

    this.subscriber.on('error', (err) => console.error('Redis subscriber error', err));
    console.log('Redis PubSub service initialised');
  }

  async onApplicationShutdown(): Promise<void> {
    await this.quitRedis();
  }

  async onModuleDestroy(): Promise<void> {
    await this.quitRedis();
  }

  private async quitRedis(): Promise<void> {
    if (this.redisShutdown) return;
    this.redisShutdown = true;
    await this.subscriber.quit();
    await this.publisher.quit();
  }

  async publish(channel: string, message: PubSubMessage): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, handler: (msg: PubSubMessage) => void): Promise<void> {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, []);
      await this.subscriber.subscribe(channel);
      console.debug(`Subscribed to Redis channel: ${channel}`);
    }
    this.listeners.get(channel)!.push(handler);
  }
}
