import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import {
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@modules/auth/decorators/public.decorator';
import { NO_LOG_KEY } from '@common/graylog/decorators/no-log.decorator';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { KafkaHealthIndicator } from './indicators/kafka.health';
import { PostgresPoolHealthIndicator } from './indicators/postgres.health';
import { MongoPoolHealthIndicator } from './indicators/mongo.health';

describe('HealthController', () => {
  let health: { check: jest.Mock };
  let postgres: { isHealthy: jest.Mock };
  let mongo: { isHealthy: jest.Mock };
  let memory: { checkHeap: jest.Mock };
  let redis: { isHealthy: jest.Mock };
  let kafka: { isHealthy: jest.Mock };
  let controller: HealthController;

  beforeEach(() => {
    health = { check: jest.fn() };
    postgres = { isHealthy: jest.fn().mockResolvedValue({ postgres: { status: 'up' } }) };
    mongo = { isHealthy: jest.fn().mockResolvedValue({ mongo: { status: 'up' } }) };
    memory = {
      checkHeap: jest.fn().mockResolvedValue({ memory_heap: { status: 'up' } }),
    };
    redis = { isHealthy: jest.fn().mockResolvedValue({ redis: { status: 'up' } }) };
    kafka = { isHealthy: jest.fn().mockResolvedValue({ kafka: { status: 'up' } }) };

    controller = new HealthController(
      health as unknown as HealthCheckService,
      postgres as unknown as PostgresPoolHealthIndicator,
      mongo as unknown as MongoPoolHealthIndicator,
      memory as unknown as MemoryHealthIndicator,
      redis as unknown as RedisHealthIndicator,
      kafka as unknown as KafkaHealthIndicator,
    );
  });

  describe('routing metadata', () => {
    it('is mounted at /health', () => {
      expect(Reflect.getMetadata(PATH_METADATA, HealthController)).toBe('health');
    });

    it('exposes GET / as the check endpoint', () => {
      expect(Reflect.getMetadata(PATH_METADATA, HealthController.prototype.check)).toBe(
        '/',
      );
      expect(
        Reflect.getMetadata(METHOD_METADATA, HealthController.prototype.check),
      ).toBe(RequestMethod.GET);
    });
  });

  describe('decorators', () => {
    const reflector = new Reflector();

    it('marks check as public', () => {
      expect(
        reflector.get(IS_PUBLIC_KEY, HealthController.prototype.check),
      ).toBe(true);
    });

    it('marks check with NoLog', () => {
      expect(
        reflector.get(NO_LOG_KEY, HealthController.prototype.check),
      ).toBe(true);
    });
  });

  describe('check', () => {
    it('delegates to HealthCheckService with all indicators', async () => {
      const expected = { status: 'ok', info: {}, error: {}, details: {} };
      health.check.mockImplementation(
        async (fns: Array<() => Promise<unknown>>) => {
          for (const fn of fns) {
            await fn();
          }
          return expected;
        },
      );

      await expect(controller.check()).resolves.toEqual(expected);

      expect(health.check).toHaveBeenCalledTimes(1);
      expect(health.check).toHaveBeenCalledWith(expect.any(Array));
      expect(health.check.mock.calls[0][0]).toHaveLength(5);

      expect(postgres.isHealthy).toHaveBeenCalledWith('postgres');
      expect(mongo.isHealthy).toHaveBeenCalledWith('mongo');
      expect(memory.checkHeap).toHaveBeenCalledWith(
        'memory_heap',
        300 * 1024 * 1024,
      );
      expect(redis.isHealthy).toHaveBeenCalledWith('redis');
      expect(kafka.isHealthy).toHaveBeenCalledWith('kafka');
    });

    it('invokes indicators in postgres → mongo → memory → redis → kafka order', async () => {
      const order: string[] = [];
      postgres.isHealthy.mockImplementation(async () => {
        order.push('postgres');
        return { postgres: { status: 'up' } };
      });
      mongo.isHealthy.mockImplementation(async () => {
        order.push('mongo');
        return { mongo: { status: 'up' } };
      });
      memory.checkHeap.mockImplementation(async () => {
        order.push('memory');
        return { memory_heap: { status: 'up' } };
      });
      redis.isHealthy.mockImplementation(async () => {
        order.push('redis');
        return { redis: { status: 'up' } };
      });
      kafka.isHealthy.mockImplementation(async () => {
        order.push('kafka');
        return { kafka: { status: 'up' } };
      });

      health.check.mockImplementation(
        async (fns: Array<() => Promise<unknown>>) => {
          for (const fn of fns) {
            await fn();
          }
          return { status: 'ok' };
        },
      );

      await controller.check();

      expect(order).toEqual([
        'postgres',
        'mongo',
        'memory',
        'redis',
        'kafka',
      ]);
    });

    it('propagates HealthCheckService failures', async () => {
      health.check.mockRejectedValue(new Error('health failed'));

      await expect(controller.check()).rejects.toThrow('health failed');
    });

    it('does not call indicators until HealthCheckService runs the callbacks', async () => {
      health.check.mockResolvedValue({ status: 'ok' });

      await controller.check();

      expect(postgres.isHealthy).not.toHaveBeenCalled();
      expect(mongo.isHealthy).not.toHaveBeenCalled();
      expect(memory.checkHeap).not.toHaveBeenCalled();
      expect(redis.isHealthy).not.toHaveBeenCalled();
      expect(kafka.isHealthy).not.toHaveBeenCalled();
    });
  });
});
