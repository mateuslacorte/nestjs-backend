import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthModule } from './health.module';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './indicators/redis.health';
import { KafkaHealthIndicator } from './indicators/kafka.health';
import { PostgresPoolHealthIndicator } from './indicators/postgres.health';
import { MongoPoolHealthIndicator } from './indicators/mongo.health';

describe('HealthModule', () => {
  it('imports TerminusModule and ConfigModule', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      HealthModule,
    ) as unknown[];

    expect(imports).toEqual(
      expect.arrayContaining([TerminusModule, ConfigModule]),
    );
    expect(imports).toHaveLength(2);
  });

  it('declares HealthController', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      HealthModule,
    ) as unknown[];

    expect(controllers).toEqual([HealthController]);
  });

  it('provides all health indicators', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      HealthModule,
    ) as unknown[];

    expect(providers).toEqual(
      expect.arrayContaining([
        RedisHealthIndicator,
        KafkaHealthIndicator,
        PostgresPoolHealthIndicator,
        MongoPoolHealthIndicator,
      ]),
    );
    expect(providers).toHaveLength(4);
  });
});
