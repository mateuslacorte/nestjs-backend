jest.mock('uuid', () => ({
  v4: jest.fn(() => 'fixed-uuid'),
}));

import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { TwitterStrategy } from './strategies/twitter.strategy';
import { TwitterAuthGuard } from './guards/twitter-auth.guard';
import { OauthExchangeService } from './services/oauth-exchange.service';
import { SessionSerializer } from './session.serializer';

type JwtAsyncOptions = {
  useFactory: (config: ConfigService) => Promise<Record<string, unknown>>;
  inject: unknown[];
};

function getJwtAsyncOptions(): JwtAsyncOptions {
  const imports = Reflect.getMetadata(
    MODULE_METADATA.IMPORTS,
    AuthModule,
  ) as Array<{
    module?: unknown;
    providers?: Array<{
      provide?: unknown;
      useFactory?: JwtAsyncOptions['useFactory'];
      inject?: unknown[];
    }>;
  }>;

  const jwtDynamicModule = imports.find(
    (entry) => entry.module === JwtModule,
  );

  const factoryProvider = jwtDynamicModule?.providers?.find(
    (provider) => typeof provider.useFactory === 'function',
  );

  if (!factoryProvider?.useFactory) {
    throw new Error('JwtModule.registerAsync factory not found');
  }

  return {
    useFactory: factoryProvider.useFactory,
    inject: factoryProvider.inject ?? [],
  };
}

describe('AuthModule', () => {
  it('declares controller, exports AuthService, and registers providers', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      AuthModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      AuthModule,
    ) as Array<unknown | { provide: unknown; useFactory?: unknown }>;
    const exportsMeta = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      AuthModule,
    ) as unknown[];

    expect(controllers).toEqual([AuthController]);
    expect(exportsMeta).toEqual([AuthService]);
    expect(providers).toEqual(
      expect.arrayContaining([
        AuthService,
        JwtStrategy,
        GoogleStrategy,
        GoogleAuthGuard,
        FacebookStrategy,
        FacebookAuthGuard,
        TwitterStrategy,
        TwitterAuthGuard,
        OauthExchangeService,
        SessionSerializer,
        expect.objectContaining({ provide: 'ARGON2_OPTIONS' }),
      ]),
    );
  });

  it('imports UsersModule, EmailModule, Mongoose feature, and JwtModule', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      AuthModule,
    ) as unknown[];

    expect(imports).toHaveLength(4);
    expect(imports.some((entry) => (entry as { module?: unknown }).module === JwtModule)).toBe(
      true,
    );
  });

  describe('ARGON2_OPTIONS provider', () => {
    it('reads argon2 options from ConfigService', () => {
      const providers = Reflect.getMetadata(
        MODULE_METADATA.PROVIDERS,
        AuthModule,
      ) as Array<{
        provide?: unknown;
        useFactory?: (config: ConfigService) => unknown;
        inject?: unknown[];
      }>;

      const argon2Provider = providers.find(
        (provider) => provider.provide === 'ARGON2_OPTIONS',
      );

      expect(argon2Provider).toBeDefined();
      expect(argon2Provider!.inject).toEqual([ConfigService]);

      const configService = {
        get: jest.fn((key: string) => {
          const values: Record<string, number> = {
            'argon2.memoryCost': 19456,
            'argon2.timeCost': 2,
            'argon2.parallelism': 1,
          };
          return values[key];
        }),
      } as unknown as ConfigService;

      expect(argon2Provider!.useFactory!(configService)).toEqual({
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
      expect(configService.get).toHaveBeenCalledWith('argon2.memoryCost');
      expect(configService.get).toHaveBeenCalledWith('argon2.timeCost');
      expect(configService.get).toHaveBeenCalledWith('argon2.parallelism');
    });
  });

  describe('JwtModule.registerAsync factory', () => {
    const { useFactory, inject } = getJwtAsyncOptions();

    it('injects ConfigService', () => {
      expect(inject).toEqual([ConfigService]);
    });

    it('builds secret and signOptions from jwt config', async () => {
      const configService = {
        get: jest.fn((key: string) => {
          const values: Record<string, unknown> = {
            'jwt.secret': 'test-jwt-secret',
            'jwt.expirationTime': '2h',
          };
          return values[key];
        }),
      } as unknown as ConfigService;

      const options = await useFactory(configService);

      expect(configService.get).toHaveBeenCalledWith('jwt.secret');
      expect(configService.get).toHaveBeenCalledWith('jwt.expirationTime');
      expect(options).toEqual({
        secret: 'test-jwt-secret',
        signOptions: {
          expiresIn: '2h',
        },
      });
    });
  });

  it('compiles AuthController with mocked AuthService', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    expect(moduleRef.get(AuthController)).toBeInstanceOf(AuthController);

    await moduleRef.close();
  });
});
