jest.mock('uuid', () => ({
  v4: jest.fn(() => 'fixed-uuid'),
}));

import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getModelToken } from '@nestjs/mongoose';
import { UsersModule } from './users.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersResolver } from './resolvers/users.resolver';
import { UserMongoRepository } from './repositories/mongo.repository';
import { UserPostgresRepository } from './repositories/postgres.repository';
import { UserEntity } from './entities/user.entity';
import { User } from './schemas/user.schema';
import { JwtAuthGuard } from '@modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';

describe('UsersModule', () => {
  it('declares controller, exports UsersService, and registers providers', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      UsersModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      UsersModule,
    ) as Array<unknown | { provide: unknown; useClass?: unknown; useFactory?: unknown }>;
    const exportsMeta = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      UsersModule,
    ) as unknown[];

    expect(controllers).toEqual([UsersController]);
    expect(exportsMeta).toEqual([UsersService]);
    expect(providers).toEqual(
      expect.arrayContaining([
        UsersResolver,
        UsersService,
        UserMongoRepository,
        UserPostgresRepository,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ]),
    );
  });

  it('imports Mongoose and TypeORM feature modules', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      UsersModule,
    ) as unknown[];

    expect(imports).toHaveLength(2);
  });

  describe('BCRYPT_SALT_ROUNDS provider', () => {
    it('reads bcrypt.saltRounds from ConfigService', () => {
      const providers = Reflect.getMetadata(
        MODULE_METADATA.PROVIDERS,
        UsersModule,
      ) as Array<{
        provide?: unknown;
        useFactory?: (config: ConfigService) => unknown;
        inject?: unknown[];
      }>;

      const bcryptProvider = providers.find(
        (provider) => provider.provide === 'BCRYPT_SALT_ROUNDS',
      );

      expect(bcryptProvider).toBeDefined();
      expect(bcryptProvider!.inject).toEqual([ConfigService]);

      const configService = {
        get: jest.fn().mockReturnValue(12),
      } as unknown as ConfigService;

      expect(bcryptProvider!.useFactory!(configService)).toBe(12);
      expect(configService.get).toHaveBeenCalledWith('bcrypt.saltRounds');
    });
  });

  it('compiles UsersService with mocked repositories', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersResolver,
        UsersService,
        {
          provide: UserPostgresRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: UserMongoRepository,
          useValue: {},
        },
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {},
        },
        {
          provide: getModelToken(User.name),
          useValue: {},
        },
        {
          provide: 'BCRYPT_SALT_ROUNDS',
          useValue: 10,
        },
      ],
    }).compile();

    expect(moduleRef.get(UsersService)).toBeInstanceOf(UsersService);
    expect(moduleRef.get(UsersController)).toBeInstanceOf(UsersController);
    expect(moduleRef.get(UsersResolver)).toBeInstanceOf(UsersResolver);

    await moduleRef.close();
  });
});
