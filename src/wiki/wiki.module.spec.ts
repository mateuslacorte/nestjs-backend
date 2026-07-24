import { MODULE_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WikiModule } from './wiki.module';
import { WikiController } from './wiki.controller';
import { WikiI18nService } from './i18n/wiki-i18n.service';
import { WikiRenderService } from './wiki-render.service';

describe('WikiModule', () => {
  it('declares controller, providers, and exports', () => {
    const controllers = Reflect.getMetadata(
      MODULE_METADATA.CONTROLLERS,
      WikiModule,
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      WikiModule,
    ) as unknown[];
    const exportsMeta = Reflect.getMetadata(
      MODULE_METADATA.EXPORTS,
      WikiModule,
    ) as unknown[];

    expect(controllers).toEqual([WikiController]);
    expect(providers).toEqual(
      expect.arrayContaining([WikiI18nService, WikiRenderService]),
    );
    expect(exportsMeta).toEqual(
      expect.arrayContaining([WikiI18nService, WikiRenderService]),
    );
  });

  it('compiles WikiController with i18n and render services', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WikiController],
      providers: [
        WikiI18nService,
        WikiRenderService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, unknown> = {
                'graphql.path': '/graphql',
                'app.apiPrefix': 'api/v1',
                'app.publicUrl': 'http://localhost:3000',
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    const i18n = moduleRef.get(WikiI18nService);
    i18n.onModuleInit();

    expect(moduleRef.get(WikiController)).toBeInstanceOf(WikiController);
    expect(moduleRef.get(WikiRenderService)).toBeInstanceOf(WikiRenderService);
    expect(i18n.t('en-US', 'home.meta.title')).not.toBe('home.meta.title');

    await moduleRef.close();
  });
});
