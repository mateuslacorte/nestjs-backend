import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import {
  HealthCheckService,
} from '@nestjs/terminus';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@modules/auth/decorators/public.decorator';
import { NO_LOG_KEY } from '@common/graylog/decorators/no-log.decorator';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { PostgresPoolHealthIndicator } from './indicators/postgres.health';
import { MongoPoolHealthIndicator } from './indicators/mongo.health';

describe('HealthController', () => {
  let health: { check: jest.Mock };
  let postgres: { isHealthy: jest.Mock };
  let mongo: { isHealthy: jest.Mock };
  let redis: { isHealthy: jest.Mock };
  let controller: HealthController;

  beforeEach(() => {
    health = { check: jest.fn() };
    postgres = { isHealthy: jest.fn().mockResolvedValue({ postgres: { status: 'up' } }) };
    mongo = { isHealthy: jest.fn().mockResolvedValue({ mongo: { status: 'up' } }) };
    redis = { isHealthy: jest.fn().mockResolvedValue({ redis: { status: 'up' } }) };

    controller = new HealthController(
      health as unknown as HealthCheckService,
      postgres as unknown as PostgresPoolHealthIndicator,
      mongo as unknown as MongoPoolHealthIndicator,
      redis as unknown as RedisHealthIndicator,
    );
  });

  describe('routing metadata', () => {
    it('is mounted at /health', () => {
      expect(Reflect.getMetadata(PATH_METADATA, HealthController)).toBe('health');
    });

    it('exposes GET /live as the liveness endpoint', () => {
      expect(Reflect.getMetadata(PATH_METADATA, HealthController.prototype.liveness)).toBe('live');
      expect(
        Reflect.getMetadata(METHOD_METADATA, HealthController.prototype.liveness),
      ).toBe(RequestMethod.GET);
    });

    it('exposes GET /ready as the readiness endpoint', () => {
      expect(Reflect.getMetadata(PATH_METADATA, HealthController.prototype.readiness)).toBe('ready');
      expect(
        Reflect.getMetadata(METHOD_METADATA, HealthController.prototype.readiness),
      ).toBe(RequestMethod.GET);
    });

    it('exposes GET / as the check endpoint', () => {
      expect(Reflect.getMetadata(PATH_METADATA, HealthController.prototype.check)).toBe('/');
      expect(
        Reflect.getMetadata(METHOD_METADATA, HealthController.prototype.check),
      ).toBe(RequestMethod.GET);
    });
  });

  describe('decorators', () => {
    const reflector = new Reflector();

    it('marks liveness as public', () => {
      expect(reflector.get(IS_PUBLIC_KEY, HealthController.prototype.liveness)).toBe(true);
    });

    it('marks liveness with NoLog', () => {
      expect(reflector.get(NO_LOG_KEY, HealthController.prototype.liveness)).toBe(true);
    });

    it('marks readiness as public', () => {
      expect(reflector.get(IS_PUBLIC_KEY, HealthController.prototype.readiness)).toBe(true);
    });

    it('marks readiness with NoLog', () => {
      expect(reflector.get(NO_LOG_KEY, HealthController.prototype.readiness)).toBe(true);
    });

    it('marks check as public', () => {
      expect(reflector.get(IS_PUBLIC_KEY, HealthController.prototype.check)).toBe(true);
    });

    it('marks check with NoLog', () => {
      expect(reflector.get(NO_LOG_KEY, HealthController.prototype.check)).toBe(true);
    });
  });

  describe('liveness', () => {
    it('returns { status: ok } without calling any indicator', () => {
      expect(controller.liveness()).toEqual({ status: 'ok' });
      expect(health.check).not.toHaveBeenCalled();
    });

    it('always returns ok regardless of dependency state', () => {
      redis.isHealthy.mockRejectedValue(new Error('redis down'));
      postgres.isHealthy.mockRejectedValue(new Error('postgres down'));
      mongo.isHealthy.mockRejectedValue(new Error('mongo down'));

      expect(controller.liveness()).toEqual({ status: 'ok' });
    });
  });

  describe('readiness', () => {
    it('delegates to HealthCheckService with redis, postgres, mongo indicators', async () => {
      const expected = { status: 'ok', info: {}, error: {}, details: {} };
      health.check.mockImplementation(
        async (fns: Array<() => Promise<unknown>>) => {
          for (const fn of fns) {
            await fn();
          }
          return expected;
        },
      );

      await expect(controller.readiness()).resolves.toEqual(expected);

      expect(health.check).toHaveBeenCalledTimes(1);
      expect(health.check).toHaveBeenCalledWith(expect.any(Array));
      expect(health.check.mock.calls[0][0]).toHaveLength(3);

      expect(redis.isHealthy).toHaveBeenCalledWith('redis');
      expect(postgres.isHealthy).toHaveBeenCalledWith('postgres');
      expect(mongo.isHealthy).toHaveBeenCalledWith('mongo');
    });

    it('invokes indicators in redis → postgres → mongo order', async () => {
      const order: string[] = [];
      redis.isHealthy.mockImplementation(async () => {
        order.push('redis');
        return { redis: { status: 'up' } };
      });
      postgres.isHealthy.mockImplementation(async () => {
        order.push('postgres');
        return { postgres: { status: 'up' } };
      });
      mongo.isHealthy.mockImplementation(async () => {
        order.push('mongo');
        return { mongo: { status: 'up' } };
      });

      health.check.mockImplementation(
        async (fns: Array<() => Promise<unknown>>) => {
          for (const fn of fns) {
            await fn();
          }
          return { status: 'ok' };
        },
      );

      await controller.readiness();

      expect(order).toEqual(['redis', 'postgres', 'mongo']);
    });

    it('propagates HealthCheckService failures', async () => {
      health.check.mockRejectedValue(new Error('readiness failed'));

      await expect(controller.readiness()).rejects.toThrow('readiness failed');
    });

    it('does not call indicators until HealthCheckService runs the callbacks', async () => {
      health.check.mockResolvedValue({ status: 'ok' });

      await controller.readiness();

      expect(redis.isHealthy).not.toHaveBeenCalled();
      expect(postgres.isHealthy).not.toHaveBeenCalled();
      expect(mongo.isHealthy).not.toHaveBeenCalled();
    });
  });

  describe('check', () => {
    it('proxies to readiness', async () => {
      const expected = { status: 'ok', info: {}, error: {}, details: {} };
      health.check.mockResolvedValue(expected);

      await expect(controller.check()).resolves.toEqual(expected);
      expect(health.check).toHaveBeenCalledTimes(1);
    });

    it('propagates readiness failures', async () => {
      health.check.mockRejectedValue(new Error('health failed'));

      await expect(controller.check()).rejects.toThrow('health failed');
    });
  });
});
