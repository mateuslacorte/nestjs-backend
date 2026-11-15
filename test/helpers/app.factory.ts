import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CqrsModule } from '@nestjs/cqrs';
import { TerminusModule } from '@nestjs/terminus';
import { getModelToken } from '@nestjs/mongoose';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

import jwtConfig from '../../src/config/jwt.config';
import appConfig from '../../src/config/app.config';
import redisConfig from '../../src/config/redis.config';
import argon2Config from '../../src/config/argon2.config';

import { AuthController } from '../../src/modules/auth/auth.controller';
import { UsersController } from '../../src/modules/users/users.controller';
import { HealthController } from '../../src/modules/health/health.controller';
import { OperationsController } from '../../src/common/operations/operations.controller';

import { AuthService } from '../../src/modules/auth/auth.service';
import { JwtStrategy } from '../../src/modules/auth/jwt.strategy';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '../../src/modules/auth/guards/roles.guard';
import { OauthExchangeService } from '../../src/modules/auth/services/oauth-exchange.service';
import { ActiveDirectoryLdapService } from '../../src/modules/auth/services/active-directory-ldap.service';
import { MetamaskSiweService } from '../../src/modules/auth/services/metamask-siwe.service';

import { GoogleAuthGuard } from '../../src/modules/auth/guards/google-auth.guard';
import { FacebookAuthGuard } from '../../src/modules/auth/guards/facebook-auth.guard';
import { TwitterAuthGuard } from '../../src/modules/auth/guards/twitter-auth.guard';
import { GithubAuthGuard } from '../../src/modules/auth/guards/github-auth.guard';
import { FigmaAuthGuard } from '../../src/modules/auth/guards/figma-auth.guard';
import { LinkedinAuthGuard } from '../../src/modules/auth/guards/linkedin-auth.guard';
import { SlackAuthGuard } from '../../src/modules/auth/guards/slack-auth.guard';
import { AtlassianAuthGuard } from '../../src/modules/auth/guards/atlassian-auth.guard';
import { GitlabAuthGuard } from '../../src/modules/auth/guards/gitlab-auth.guard';
import { BitbucketAuthGuard } from '../../src/modules/auth/guards/bitbucket-auth.guard';
import { DiscordAuthGuard } from '../../src/modules/auth/guards/discord-auth.guard';
import { TwitchAuthGuard } from '../../src/modules/auth/guards/twitch-auth.guard';
import { SteamAuthGuard } from '../../src/modules/auth/guards/steam-auth.guard';
import { AppleAuthGuard } from '../../src/modules/auth/guards/apple-auth.guard';
import { AmazonAuthGuard } from '../../src/modules/auth/guards/amazon-auth.guard';
import { PatreonAuthGuard } from '../../src/modules/auth/guards/patreon-auth.guard';
import { DropboxAuthGuard } from '../../src/modules/auth/guards/dropbox-auth.guard';

import { UsersService } from '../../src/modules/users/users.service';
import { UserMongoRepository } from '../../src/modules/users/repositories/mongo.repository';
import { UserPostgresRepository } from '../../src/modules/users/repositories/postgres.repository';
import { UserEntity } from '../../src/modules/users/entities/user.entity';
import { User } from '../../src/modules/users/schemas/user.schema';

import { CreateUserHandler } from '../../src/modules/users/commands/handlers/create-user.handler';
import { UpdateUserHandler } from '../../src/modules/users/commands/handlers/update-user.handler';
import { DeleteUserHandler } from '../../src/modules/users/commands/handlers/delete-user.handler';
import { FindUserByIdHandler } from '../../src/modules/users/queries/handlers/find-user-by-id.handler';
import { SearchUsersHandler } from '../../src/modules/users/queries/handlers/search-users.handler';
import { UserCreatedHandler } from '../../src/modules/users/events/handlers/user-created.handler';
import { UserUpdatedHandler } from '../../src/modules/users/events/handlers/user-updated.handler';
import { UserDeletedHandler } from '../../src/modules/users/events/handlers/user-deleted.handler';

import { CacheService } from '../../src/common/cache/cache.service';
import { OperationStatusService } from '../../src/common/operations/operation-status.service';
import { AuditInterceptor } from '../../src/common/audit/audit.interceptor';
import { AuditService } from '../../src/common/audit/audit.service';
import { DlqService } from '../../src/common/dlq/dlq.service';
import { RedisPubSubService } from '../../src/common/pubsub/redis-pubsub.service';
import { EmailService } from '../../src/modules/email/email.service';

import { RedisHealthIndicator } from '../../src/modules/health/indicators/redis.health';
import { KafkaHealthIndicator } from '../../src/modules/health/indicators/kafka.health';
import { PostgresPoolHealthIndicator } from '../../src/modules/health/indicators/postgres.health';
import { MongoPoolHealthIndicator } from '../../src/modules/health/indicators/mongo.health';

export const TEST_JWT_SECRET = 'e2e-test-jwt-secret-at-least-32-chars-pad';
export const TEST_JWT_REFRESH_SECRET = 'e2e-refresh-jwt-secret-32-chars-pad';

const mockCanActivate = { canActivate: jest.fn().mockResolvedValue(true) };

function createMockRedis() {
  const store = new Map<string, string>();
  return {
    get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    setex: jest.fn((key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((...keys: string[]) => {
      for (const k of keys) store.delete(k);
      return Promise.resolve(keys.length);
    }),
    scan: jest.fn().mockResolvedValue(['0', []]),
    keys: jest.fn().mockResolvedValue([]),
    ping: jest.fn().mockResolvedValue('PONG'),
    subscribe: jest.fn().mockResolvedValue(undefined),
    publish: jest.fn().mockResolvedValue(0),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    duplicate: jest.fn().mockReturnThis(),
    _store: store,
  };
}

function createMockMongoUserModel() {
  const model: any = jest.fn().mockImplementation((data: any) => ({
    ...data,
    save: jest.fn().mockResolvedValue(undefined),
    toObject: jest.fn().mockReturnValue({ ...data }),
  }));
  model.findOne = jest.fn().mockResolvedValue(null);
  model.find = jest.fn().mockResolvedValue([]);
  model.findById = jest.fn().mockResolvedValue(null);
  model.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
  model.findByIdAndDelete = jest.fn().mockResolvedValue(null);
  model.create = jest.fn().mockResolvedValue({});
  model.countDocuments = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });
  return model;
}

function createMockTypeOrmUserRepo() {
  return {
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockImplementation((entity: any) => Promise.resolve(entity)),
    create: jest.fn().mockImplementation((data: any) => ({ ...data })),
    remove: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null),
      getCount: jest.fn().mockResolvedValue(0),
    }),
  };
}

export interface TestContext {
  app: NestFastifyApplication;
  moduleRef: TestingModule;
  redisStore: Map<string, string>;
  mongoModel: ReturnType<typeof createMockMongoUserModel>;
  pgRepo: ReturnType<typeof createMockTypeOrmUserRepo>;
}

export async function createTestApp(): Promise<TestContext> {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
  process.env.ARGON2_MEMORY_COST = '1024';
  process.env.ARGON2_TIME_COST = '1';
  process.env.ARGON2_PARALLELISM = '1';

  const redisClient = createMockRedis();
  const mongoModel = createMockMongoUserModel();
  const pgRepo = createMockTypeOrmUserRepo();

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [jwtConfig, appConfig, redisConfig, argon2Config],
      }),
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.register({
        secret: TEST_JWT_SECRET,
        signOptions: { expiresIn: '1h' },
      }),
      ThrottlerModule.forRoot([{ ttl: 60_000, limit: 999 }]),
      CqrsModule,
      TerminusModule,
    ],
    controllers: [
      AuthController,
      UsersController,
      HealthController,
      OperationsController,
    ],
    providers: [
      { provide: APP_GUARD, useClass: JwtAuthGuard },
      { provide: APP_GUARD, useClass: ThrottlerGuard },

      JwtStrategy,
      AuthService,
      OauthExchangeService,

      { provide: 'ARGON2_OPTIONS', useValue: { memoryCost: 1024, timeCost: 1, parallelism: 1 } },

      { provide: ActiveDirectoryLdapService, useValue: { authenticate: jest.fn().mockRejectedValue(new Error('AD disabled')) } },
      { provide: MetamaskSiweService, useValue: { createNonce: jest.fn().mockResolvedValue({ nonce: 'test-nonce', expiresIn: 60 }), verifyAndGetProfile: jest.fn().mockRejectedValue(new Error('Disabled')) } },
      { provide: EmailService, useValue: { sendEmailConfirmation: jest.fn().mockResolvedValue(undefined), sendPasswordReset: jest.fn().mockResolvedValue(undefined), sendMail: jest.fn().mockResolvedValue(undefined) } },

      // Mocked OAuth guards (resolved lazily per-route but DI must find them)
      { provide: GoogleAuthGuard, useValue: mockCanActivate },
      { provide: FacebookAuthGuard, useValue: mockCanActivate },
      { provide: TwitterAuthGuard, useValue: mockCanActivate },
      { provide: GithubAuthGuard, useValue: mockCanActivate },
      { provide: FigmaAuthGuard, useValue: mockCanActivate },
      { provide: LinkedinAuthGuard, useValue: mockCanActivate },
      { provide: SlackAuthGuard, useValue: mockCanActivate },
      { provide: AtlassianAuthGuard, useValue: mockCanActivate },
      { provide: GitlabAuthGuard, useValue: mockCanActivate },
      { provide: BitbucketAuthGuard, useValue: mockCanActivate },
      { provide: DiscordAuthGuard, useValue: mockCanActivate },
      { provide: TwitchAuthGuard, useValue: mockCanActivate },
      { provide: SteamAuthGuard, useValue: mockCanActivate },
      { provide: AppleAuthGuard, useValue: mockCanActivate },
      { provide: AmazonAuthGuard, useValue: mockCanActivate },
      { provide: PatreonAuthGuard, useValue: mockCanActivate },
      { provide: DropboxAuthGuard, useValue: mockCanActivate },

      { provide: 'REDIS_CLIENT', useValue: redisClient },
      CacheService,

      UsersService,
      UserMongoRepository,
      UserPostgresRepository,
      { provide: getModelToken(User.name), useValue: mongoModel },
      { provide: getRepositoryToken(UserEntity), useValue: pgRepo },

      CreateUserHandler,
      UpdateUserHandler,
      DeleteUserHandler,
      FindUserByIdHandler,
      SearchUsersHandler,
      UserCreatedHandler,
      UserUpdatedHandler,
      UserDeletedHandler,

      {
        provide: DlqService,
        useValue: {
          registerHandler: jest.fn(),
          push: jest.fn().mockResolvedValue(undefined),
          onModuleInit: jest.fn().mockResolvedValue(undefined),
          onModuleDestroy: jest.fn().mockResolvedValue(undefined),
        },
      },
      {
        provide: RedisPubSubService,
        useValue: {
          subscribe: jest.fn().mockResolvedValue(undefined),
          publish: jest.fn().mockResolvedValue(undefined),
          onModuleInit: jest.fn(),
          onModuleDestroy: jest.fn(),
        },
      },

      OperationStatusService,
      RolesGuard,

      AuditInterceptor,
      { provide: AuditService, useValue: { record: jest.fn().mockResolvedValue(undefined), search: jest.fn().mockResolvedValue({ items: [], nextCursor: null }) } },

      RedisHealthIndicator,
      { provide: KafkaHealthIndicator, useValue: { isHealthy: jest.fn().mockResolvedValue({ kafka: { status: 'up' } }) } },
      { provide: PostgresPoolHealthIndicator, useValue: { isHealthy: jest.fn().mockResolvedValue({ postgres: { status: 'up' } }) } },
      { provide: MongoPoolHealthIndicator, useValue: { isHealthy: jest.fn().mockResolvedValue({ mongo: { status: 'up' } }) } },
    ],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return { app, moduleRef, redisStore: redisClient._store, mongoModel, pgRepo };
}

export async function closeTestApp(app: NestFastifyApplication): Promise<void> {
  await app.close();
}
