import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { MailerModule, MailerService } from '@nestjs-modules/mailer';
import { PugAdapter } from '@nestjs-modules/mailer/adapters/pug.adapter';
import { join } from 'path';
import { EmailModule } from './email.module';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { JwtAuthGuard } from '@modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';

type MailerAsyncOptions = {
  useFactory: (config: ConfigService) => Promise<Record<string, unknown>>;
  inject: unknown[];
};

function getMailerAsyncOptions(): MailerAsyncOptions {
  const imports = Reflect.getMetadata(
    MODULE_METADATA.IMPORTS,
    EmailModule,
  ) as Array<{
    imports?: Array<{
      providers?: Array<{
        useFactory?: MailerAsyncOptions['useFactory'];
        inject?: unknown[];
      }>;
    }>;
  }>;

  const mailerModule = imports[0];
  const coreModule = mailerModule.imports?.[0];
  const factoryProvider = coreModule?.providers?.find(
    (provider) => typeof provider.useFactory === 'function',
  );

  if (!factoryProvider?.useFactory) {
    throw new Error('MailerModule.forRootAsync factory not found');
  }

  return {
    useFactory: factoryProvider.useFactory,
    inject: factoryProvider.inject ?? [],
  };
}

describe('EmailModule', () => {
  it('declares controller, service export, and APP_GUARD providers', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      EmailModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      EmailModule,
    ) as Array<unknown | { provide: unknown; useClass: unknown }>;
    const exportsMeta = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      EmailModule,
    ) as unknown[];

    expect(controllers).toEqual([EmailController]);
    expect(exportsMeta).toEqual([EmailService]);
    expect(providers).toEqual(
      expect.arrayContaining([
        EmailService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ]),
    );
  });

  it('imports MailerModule async configuration', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      EmailModule,
    ) as unknown[];

    expect(imports).toHaveLength(1);
    expect(imports[0]).toEqual(
      expect.objectContaining({
        module: MailerModule,
      }),
    );
  });

  describe('MailerModule.forRootAsync factory', () => {
    const { useFactory, inject } = getMailerAsyncOptions();

    it('injects ConfigService', () => {
      expect(inject).toEqual([ConfigService]);
    });

    it('builds transport, defaults, and pug template options from config', async () => {
      const configService = {
        get: jest.fn((key: string) => {
          const values: Record<string, unknown> = {
            'smtp.auth': { user: 'smtp-user', pass: 'smtp-pass' },
            'smtp.host': 'smtp.example.com',
            'smtp.port': 587,
            'smtp.secure': false,
            'smtp.requireTLS': true,
            'smtp.from': '"App" <noreply@example.com>',
          };
          return values[key];
        }),
      } as unknown as ConfigService;

      const options = await useFactory(configService);

      expect(configService.get).toHaveBeenCalledWith('smtp.auth');
      expect(configService.get).toHaveBeenCalledWith('smtp.host');
      expect(configService.get).toHaveBeenCalledWith('smtp.port');
      expect(configService.get).toHaveBeenCalledWith('smtp.secure');
      expect(configService.get).toHaveBeenCalledWith('smtp.requireTLS');
      expect(configService.get).toHaveBeenCalledWith('smtp.from');

      expect(options).toEqual(
        expect.objectContaining({
          transport: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: { user: 'smtp-user', pass: 'smtp-pass' },
          },
          defaults: {
            from: '"App" <noreply@example.com>',
          },
          template: expect.objectContaining({
            dir: join(__dirname, 'templates'),
            options: { strict: true },
          }),
        }),
      );
      expect(
        (options.template as { adapter: unknown }).adapter,
      ).toBeInstanceOf(PugAdapter);
    });

    it('omits auth from transport when smtp.auth is undefined', async () => {
      const configService = {
        get: jest.fn((key: string) => {
          const values: Record<string, unknown> = {
            'smtp.auth': undefined,
            'smtp.host': 'localhost',
            'smtp.port': 1025,
            'smtp.secure': false,
            'smtp.requireTLS': false,
            'smtp.from': 'local@test',
          };
          return values[key];
        }),
      } as unknown as ConfigService;

      const options = await useFactory(configService);
      const transport = options.transport as Record<string, unknown>;

      expect(transport).toEqual({
        host: 'localhost',
        port: 1025,
        secure: false,
        requireTLS: false,
      });
      expect(transport.auth).toBeUndefined();
    });
  });

  it('compiles EmailController and EmailService with MailerService', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        EmailService,
        {
          provide: MailerService,
          useValue: { sendMail: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    expect(moduleRef.get(EmailService)).toBeInstanceOf(EmailService);
    expect(moduleRef.get(EmailController)).toBeInstanceOf(EmailController);

    await moduleRef.close();
  });
});
