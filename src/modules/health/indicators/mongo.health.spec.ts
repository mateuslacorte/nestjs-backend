import { ConfigService } from '@nestjs/config';
import { HealthCheckError, MongooseHealthIndicator } from '@nestjs/terminus';
import { MongoPoolHealthIndicator } from './mongo.health';

describe('MongoPoolHealthIndicator', () => {
  let mongo: { pingCheck: jest.Mock };
  let configService: { get: jest.Mock };
  let indicator: MongoPoolHealthIndicator;

  const poolConfig = {
    maxPoolSize: 20,
    minPoolSize: 1,
    maxIdleTimeMS: 60000,
    waitQueueTimeoutMS: 10000,
  };

  beforeEach(() => {
    mongo = { pingCheck: jest.fn() };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, number> = {
          'database.mongo.maxPoolSize': poolConfig.maxPoolSize,
          'database.mongo.minPoolSize': poolConfig.minPoolSize,
          'database.mongo.maxIdleTimeMS': poolConfig.maxIdleTimeMS,
          'database.mongo.waitQueueTimeoutMS': poolConfig.waitQueueTimeoutMS,
        };
        return values[key];
      }),
    };

    indicator = new MongoPoolHealthIndicator(
      mongo as unknown as MongooseHealthIndicator,
      configService as unknown as ConfigService,
    );
  });

  describe('isHealthy', () => {
    it('returns ping status merged with pool config when healthy', async () => {
      mongo.pingCheck.mockResolvedValue({
        mongo: { status: 'up' },
      });

      await expect(indicator.isHealthy('mongo')).resolves.toEqual({
        mongo: {
          status: 'up',
          pool: poolConfig,
        },
      });
      expect(mongo.pingCheck).toHaveBeenCalledWith('mongo');
    });

    it('preserves extra fields from pingCheck', async () => {
      mongo.pingCheck.mockResolvedValue({
        mongo: { status: 'up', message: 'pong' },
      });

      await expect(indicator.isHealthy('mongo')).resolves.toEqual({
        mongo: {
          status: 'up',
          message: 'pong',
          pool: poolConfig,
        },
      });
    });

    it('reads pool settings from ConfigService', async () => {
      mongo.pingCheck.mockResolvedValue({ mongo: { status: 'up' } });

      await indicator.isHealthy('mongo');

      expect(configService.get).toHaveBeenCalledWith(
        'database.mongo.maxPoolSize',
      );
      expect(configService.get).toHaveBeenCalledWith(
        'database.mongo.minPoolSize',
      );
      expect(configService.get).toHaveBeenCalledWith(
        'database.mongo.maxIdleTimeMS',
      );
      expect(configService.get).toHaveBeenCalledWith(
        'database.mongo.waitQueueTimeoutMS',
      );
    });

    it('uses the provided key in the result', async () => {
      mongo.pingCheck.mockResolvedValue({
        'mongo-primary': { status: 'up' },
      });

      await expect(indicator.isHealthy('mongo-primary')).resolves.toEqual({
        'mongo-primary': {
          status: 'up',
          pool: poolConfig,
        },
      });
      expect(mongo.pingCheck).toHaveBeenCalledWith('mongo-primary');
    });

    it('throws HealthCheckError with Error message when ping fails', async () => {
      mongo.pingCheck.mockRejectedValue(new Error('topology closed'));

      try {
        await indicator.isHealthy('mongo');
        fail('expected HealthCheckError');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        const healthError = error as HealthCheckError;
        expect(healthError.message).toBe('Mongo check failed');
        expect(healthError.causes).toEqual({
          mongo: {
            status: 'down',
            message: 'topology closed',
            pool: poolConfig,
          },
        });
      }
    });

    it('uses fallback message when ping rejects with a non-Error', async () => {
      mongo.pingCheck.mockRejectedValue('gone');

      try {
        await indicator.isHealthy('mongo');
        fail('expected HealthCheckError');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        expect((error as HealthCheckError).causes).toEqual({
          mongo: {
            status: 'down',
            message: 'Mongo unreachable',
            pool: poolConfig,
          },
        });
      }
    });

    it('includes undefined pool values when config is missing', async () => {
      configService.get.mockReturnValue(undefined);
      mongo.pingCheck.mockResolvedValue({ mongo: { status: 'up' } });

      await expect(indicator.isHealthy('mongo')).resolves.toEqual({
        mongo: {
          status: 'up',
          pool: {
            maxPoolSize: undefined,
            minPoolSize: undefined,
            maxIdleTimeMS: undefined,
            waitQueueTimeoutMS: undefined,
          },
        },
      });
    });
  });
});
