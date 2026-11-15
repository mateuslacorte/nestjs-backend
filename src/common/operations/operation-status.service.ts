import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';

export type OperationState = 'pending' | 'completed' | 'failed';

export interface OperationStatus {
  operationId: string;
  status: OperationState;
  startedAt: number;
  updatedAt: number;
  result?: unknown;
  error?: string;
}

/** Redis TTL for completed/failed entries — 24 h */
const TTL_SECONDS = 86_400;
/** Pending entries live for 1 h; a successful event handler will update before then */
const PENDING_TTL = 3_600;

function key(operationId: string): string {
  return `op:status:${operationId}`;
}

@Injectable()
export class OperationStatusService {
  private readonly logger = new Logger(OperationStatusService.name);

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async pending(operationId: string): Promise<void> {
    const entry: OperationStatus = {
      operationId,
      status: 'pending',
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.redis.setex(key(operationId), PENDING_TTL, JSON.stringify(entry));
  }

  async complete(operationId: string, result?: unknown): Promise<void> {
    const existing = await this.getOrNull(operationId);
    const entry: OperationStatus = {
      operationId,
      status: 'completed',
      startedAt: existing?.startedAt ?? Date.now(),
      updatedAt: Date.now(),
      result,
    };
    await this.redis.setex(key(operationId), TTL_SECONDS, JSON.stringify(entry));
    this.logger.debug(`Operation ${operationId} completed`);
  }

  async fail(operationId: string, error: string): Promise<void> {
    const existing = await this.getOrNull(operationId);
    const entry: OperationStatus = {
      operationId,
      status: 'failed',
      startedAt: existing?.startedAt ?? Date.now(),
      updatedAt: Date.now(),
      error,
    };
    await this.redis.setex(key(operationId), TTL_SECONDS, JSON.stringify(entry));
    this.logger.warn(`Operation ${operationId} failed: ${error}`);
  }

  async get(operationId: string): Promise<OperationStatus> {
    const status = await this.getOrNull(operationId);
    if (!status) throw new NotFoundException(`Operation ${operationId} not found`);
    return status;
  }

  private async getOrNull(operationId: string): Promise<OperationStatus | null> {
    try {
      const raw = await this.redis.get(key(operationId));
      return raw ? (JSON.parse(raw) as OperationStatus) : null;
    } catch {
      return null;
    }
  }
}
