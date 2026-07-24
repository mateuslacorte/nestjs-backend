import { ConfigService } from '@nestjs/config';
import { HealthCheckError } from '@nestjs/terminus';
import { Kafka, logLevel } from 'kafkajs';
import { KafkaHealthIndicator } from './kafka.health';

jest.mock('kafkajs', () => {
  const connect = jest.fn();
  const listTopics = jest.fn();
  const disconnect = jest.fn();
  const admin = jest.fn(() => ({ connect, listTopics, disconnect }));
  const KafkaMock = jest.fn().mockImplementation(() => ({ admin }));

  return {
    Kafka: KafkaMock,
    logLevel: { NOTHING: 0 },
    __mocks: { connect, listTopics, disconnect, admin, KafkaMock },
  };
});

const kafkajsMock = jest.requireMock('kafkajs') as {
  Kafka: jest.Mock;
  logLevel: { NOTHING: number };
  __mocks: {
    connect: jest.Mock;
    listTopics: jest.Mock;
    disconnect: jest.Mock;
    admin: jest.Mock;
    KafkaMock: jest.Mock;
  };
};

describe('KafkaHealthIndicator', () => {
  let configService: { get: jest.Mock };
  let indicator: KafkaHealthIndicator;
  const { connect, listTopics, disconnect, admin, KafkaMock } =
    kafkajsMock.__mocks;

  const baseKafkaConfig = {
    clientId: 'health-client',
    brokers: ['localhost:9092'],
    ssl: false,
    sasl: { mechanism: 'plain', username: '', password: '' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    connect.mockResolvedValue(undefined);
    listTopics.mockResolvedValue(['topic-a']);
    disconnect.mockResolvedValue(undefined);
    admin.mockReturnValue({ connect, listTopics, disconnect });
    KafkaMock.mockImplementation(() => ({ admin }));

    configService = {
      get: jest.fn().mockReturnValue(baseKafkaConfig),
    };

    indicator = new KafkaHealthIndicator(
      configService as unknown as ConfigService,
    );
  });

  describe('isHealthy', () => {
    it('connects, lists topics, and returns up status', async () => {
      await expect(indicator.isHealthy('kafka')).resolves.toEqual({
        kafka: { status: 'up' },
      });

      expect(configService.get).toHaveBeenCalledWith('kafka');
      expect(Kafka).toHaveBeenCalledWith({
        clientId: 'health-client',
        brokers: ['localhost:9092'],
        ssl: false,
        logLevel: logLevel.NOTHING,
      });
      expect(admin).toHaveBeenCalledTimes(1);
      expect(connect).toHaveBeenCalledTimes(1);
      expect(listTopics).toHaveBeenCalledTimes(1);
      expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it('includes SASL options when username is set', async () => {
      configService.get.mockReturnValue({
        ...baseKafkaConfig,
        sasl: {
          mechanism: 'plain',
          username: 'user',
          password: 'secret',
        },
      });

      await indicator.isHealthy('kafka');

      expect(Kafka).toHaveBeenCalledWith({
        clientId: 'health-client',
        brokers: ['localhost:9092'],
        ssl: false,
        logLevel: logLevel.NOTHING,
        sasl: {
          mechanism: 'plain',
          username: 'user',
          password: 'secret',
        },
      });
    });

    it('omits SASL when username is empty', async () => {
      await indicator.isHealthy('kafka');

      const options = KafkaMock.mock.calls[0][0] as Record<string, unknown>;
      expect(options.sasl).toBeUndefined();
    });

    it('omits SASL when sasl config is missing', async () => {
      configService.get.mockReturnValue({
        clientId: 'c',
        brokers: ['b:1'],
        ssl: true,
      });

      await indicator.isHealthy('kafka');

      const options = KafkaMock.mock.calls[0][0] as Record<string, unknown>;
      expect(options.sasl).toBeUndefined();
      expect(options.ssl).toBe(true);
    });

    it('defaults brokers to empty array when config is missing', async () => {
      configService.get.mockReturnValue(undefined);

      await indicator.isHealthy('kafka');

      expect(Kafka).toHaveBeenCalledWith({
        clientId: undefined,
        brokers: [],
        ssl: undefined,
        logLevel: logLevel.NOTHING,
      });
    });

    it('uses the provided key in the result', async () => {
      await expect(indicator.isHealthy('kafka-cluster')).resolves.toEqual({
        'kafka-cluster': { status: 'up' },
      });
    });

    it('throws HealthCheckError when connect fails', async () => {
      connect.mockRejectedValue(new Error('broker unavailable'));

      try {
        await indicator.isHealthy('kafka');
        fail('expected HealthCheckError');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        const healthError = error as HealthCheckError;
        expect(healthError.message).toBe('Kafka check failed');
        expect(healthError.causes).toEqual({
          kafka: {
            status: 'down',
            message: 'broker unavailable',
          },
        });
      }
      expect(disconnect).toHaveBeenCalled();
    });

    it('throws HealthCheckError when listTopics fails', async () => {
      listTopics.mockRejectedValue(new Error('auth failed'));

      try {
        await indicator.isHealthy('kafka');
        fail('expected HealthCheckError');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        expect((error as HealthCheckError).causes).toEqual({
          kafka: {
            status: 'down',
            message: 'auth failed',
          },
        });
      }
      expect(disconnect).toHaveBeenCalled();
    });

    it('uses fallback message when failure is a non-Error', async () => {
      connect.mockRejectedValue('offline');

      try {
        await indicator.isHealthy('kafka');
        fail('expected HealthCheckError');
      } catch (error) {
        expect(error).toBeInstanceOf(HealthCheckError);
        expect((error as HealthCheckError).causes).toEqual({
          kafka: {
            status: 'down',
            message: 'Kafka unreachable',
          },
        });
      }
    });

    it('still disconnects when disconnect itself rejects', async () => {
      disconnect.mockRejectedValue(new Error('already closed'));

      await expect(indicator.isHealthy('kafka')).resolves.toEqual({
        kafka: { status: 'up' },
      });
      expect(disconnect).toHaveBeenCalledTimes(1);
    });

    it('disconnects even when the health check fails', async () => {
      connect.mockRejectedValue(new Error('boom'));
      disconnect.mockRejectedValue(new Error('disconnect failed'));

      await expect(indicator.isHealthy('kafka')).rejects.toBeInstanceOf(
        HealthCheckError,
      );
      expect(disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
