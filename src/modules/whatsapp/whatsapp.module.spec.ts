import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { WhatsappModule } from './whatsapp.module';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { JwtAuthGuard } from '@modules/auth/guards/jwtauth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';

describe('WhatsappModule', () => {
  it('declares controller, service export, and APP_GUARD providers', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      WhatsappModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      WhatsappModule,
    ) as Array<unknown | { provide: unknown; useClass: unknown }>;
    const exportsMeta = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      WhatsappModule,
    ) as unknown[];

    expect(controllers).toEqual([WhatsappController]);
    expect(exportsMeta).toEqual([WhatsappService]);
    expect(providers).toEqual(
      expect.arrayContaining([
        WhatsappService,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ]),
    );
  });

  it('compiles WhatsappController and WhatsappService with ConfigService', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WhatsappController],
      providers: [
        WhatsappService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                'whatsapp.key': 'key',
                'whatsapp.url': 'https://evo.example.com',
                'whatsapp.instance': 'default',
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    expect(moduleRef.get(WhatsappService)).toBeInstanceOf(WhatsappService);
    expect(moduleRef.get(WhatsappController)).toBeInstanceOf(
      WhatsappController,
    );

    await moduleRef.close();
  });
});
