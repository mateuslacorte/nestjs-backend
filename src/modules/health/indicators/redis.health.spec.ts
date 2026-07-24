import { HealthCheckError } from '@nestjs/terminus';
import { CacheService } from '@common/cache/cache.service';
import { RedisHealthIndicator } from './redis.health';

describe('RedisHealthIndicator', () => {
  let cacheService: { ping: jest.Mock };
  let indicator: RedisHealthIndicator;

  beforeEach(() => {
    cacheService = { ping: jest.fn() };
    indicator = new RedisHealthIndicator(
      cacheService as unknown as CacheService,
    );
  });

  describe('isHealthy', () => {
    it('returns up status when ping succeeds', async () => {
      cacheService.ping.mockResolvedValue(true);

      await expect(indicator.isHealthy('redis')).resolves.toEqual({
        redis: { status: 'up' },
      });
      expect(cacheService.ping).toHaveBeenCalledTimes(1);
    });

    it('uses the provided key in the result', async () => {
      cacheService.ping.mockResolvedValue(true);

      await expect(indicator.isHealthy('custom-redis')).resolves.toEqual({
        'custom-redis': { status: 'up' },
      });
    });

    it('throws HealthCheckError when ping returns false', async () => {
      cacheService.ping.mockResolvedValue(false);

      await expect(indicator.isHealthy('redis')).rejects.toBeInstanceOf(
        HealthCheckError,
      );

      try {
        await indicator.isHealthy('redis');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        const healthError = error as HealthCheckError;
        expect(healthError.message).toBe('Redis check failed');
        expect(healthError.causes).toEqual({
          redis: {
            status: 'down',
            message: 'Redis check failed',
          },
        });
      }
    });

    it('throws HealthCheckError with Error message when ping rejects', async () => {
      cacheService.ping.mockRejectedValue(new Error('ECONNREFUSED'));

      try {
        await indicator.isHealthy('redis');
        fail('expected HealthCheckError');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        const healthError = error as HealthCheckError;
        expect(healthError.message).toBe('Redis check failed');
        expect(healthError.causes).toEqual({
          redis: {
            status: 'down',
            message: 'ECONNREFUSED',
          },
        });
      }
    });

    it('uses fallback message when ping rejects with a non-Error', async () => {
      cacheService.ping.mockRejectedValue('timeout');

      try {
        await indicator.isHealthy('redis');
        fail('expected HealthCheckError');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        expect((error as HealthCheckError).causes).toEqual({
          redis: {
            status: 'down',
            message: 'Redis unreachable',
          },
        });
      }
    });
  });
});
