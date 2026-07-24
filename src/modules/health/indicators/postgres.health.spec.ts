import { ConfigService } from '@nestjs/config';
import { HealthCheckError, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { PostgresPoolHealthIndicator } from './postgres.health';

describe('PostgresPoolHealthIndicator', () => {
  let db: { pingCheck: jest.Mock };
  let configService: { get: jest.Mock };
  let indicator: PostgresPoolHealthIndicator;

  const poolConfig = {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  beforeEach(() => {
    db = { pingCheck: jest.fn() };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, number> = {
          'database.postgres.extra.max': poolConfig.max,
          'database.postgres.extra.min': poolConfig.min,
          'database.postgres.extra.idleTimeoutMillis':
            poolConfig.idleTimeoutMillis,
          'database.postgres.extra.connectionTimeoutMillis':
            poolConfig.connectionTimeoutMillis,
        };
        return values[key];
      }),
    };

    indicator = new PostgresPoolHealthIndicator(
      db as unknown as TypeOrmHealthIndicator,
      configService as unknown as ConfigService,
    );
  });

  describe('isHealthy', () => {
    it('returns ping status merged with pool config when healthy', async () => {
      db.pingCheck.mockResolvedValue({
        postgres: { status: 'up' },
      });

      await expect(indicator.isHealthy('postgres')).resolves.toEqual({
        postgres: {
          status: 'up',
          pool: poolConfig,
        },
      });
      expect(db.pingCheck).toHaveBeenCalledWith('postgres');
    });

    it('preserves extra fields from pingCheck', async () => {
      db.pingCheck.mockResolvedValue({
        postgres: { status: 'up', message: 'ok' },
      });

      await expect(indicator.isHealthy('postgres')).resolves.toEqual({
        postgres: {
          status: 'up',
          message: 'ok',
          pool: poolConfig,
        },
      });
    });

    it('reads pool settings from ConfigService', async () => {
      db.pingCheck.mockResolvedValue({ postgres: { status: 'up' } });

      await indicator.isHealthy('postgres');

      expect(configService.get).toHaveBeenCalledWith(
        'database.postgres.extra.max',
      );
      expect(configService.get).toHaveBeenCalledWith(
        'database.postgres.extra.min',
      );
      expect(configService.get).toHaveBeenCalledWith(
        'database.postgres.extra.idleTimeoutMillis',
      );
      expect(configService.get).toHaveBeenCalledWith(
        'database.postgres.extra.connectionTimeoutMillis',
      );
    });

    it('uses the provided key in the result', async () => {
      db.pingCheck.mockResolvedValue({
        'db-main': { status: 'up' },
      });

      await expect(indicator.isHealthy('db-main')).resolves.toEqual({
        'db-main': {
          status: 'up',
          pool: poolConfig,
        },
      });
      expect(db.pingCheck).toHaveBeenCalledWith('db-main');
    });

    it('throws HealthCheckError with Error message when ping fails', async () => {
      db.pingCheck.mockRejectedValue(new Error('connection refused'));

      try {
        await indicator.isHealthy('postgres');
        fail('expected HealthCheckError');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        const healthError = error as HealthCheckError;
        expect(healthError.message).toBe('Postgres check failed');
        expect(healthError.causes).toEqual({
          postgres: {
            status: 'down',
            message: 'connection refused',
            pool: poolConfig,
          },
        });
      }
    });

    it('uses fallback message when ping rejects with a non-Error', async () => {
      db.pingCheck.mockRejectedValue({ code: 'ECONNRESET' });

      try {
        await indicator.isHealthy('postgres');
        fail('expected HealthCheckError');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        expect((error as HealthCheckError).causes).toEqual({
          postgres: {
            status: 'down',
            message: 'Postgres unreachable',
            pool: poolConfig,
          },
        });
      }
    });

    it('includes undefined pool values when config is missing', async () => {
      configService.get.mockReturnValue(undefined);
      db.pingCheck.mockResolvedValue({ postgres: { status: 'up' } });

      await expect(indicator.isHealthy('postgres')).resolves.toEqual({
        postgres: {
          status: 'up',
          pool: {
            max: undefined,
            min: undefined,
            idleTimeoutMillis: undefined,
            connectionTimeoutMillis: undefined,
          },
        },
      });
    });
  });
});
