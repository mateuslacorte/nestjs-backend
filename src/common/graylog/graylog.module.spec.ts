import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { WikiModule } from '../../wiki/wiki.module';
import { WikiRenderService } from '../../wiki/wiki-render.service';
import { GraylogLoggerService } from './graylog-logger.service';
import { GraylogModule } from './graylog.module';
import { GraylogService } from './graylog.service';

jest.mock('axios', () => {
  const mockClient = {
    post: jest.fn().mockResolvedValue({ data: {} }),
  };
  return {
    create: jest.fn(() => mockClient),
  };
});

@Module({
  providers: [
    {
      provide: WikiRenderService,
      useValue: {
        shouldRenderWikiNotFound: jest.fn().mockReturnValue(false),
        shouldRenderWikiServerError: jest.fn().mockReturnValue(false),
        renderNotFound: jest.fn(),
        renderServerError: jest.fn(),
      },
    },
  ],
  exports: [WikiRenderService],
})
class StubWikiModule {}

describe('GraylogModule', () => {
  it('provides and exports GraylogService and GraylogLoggerService', async () => {
    const logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    const errorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              graylog: {
                enabled: false,
                host: 'test-host',
                facility: 'test',
                endpoint: 'http://localhost:12201/gelf',
                timeout: 3000,
              },
            }),
          ],
        }),
        GraylogModule,
      ],
    })
      .overrideModule(WikiModule)
      .useModule(StubWikiModule)
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: string) => {
          const values: Record<string, unknown> = {
            'graylog.enabled': false,
            'graylog.host': 'test-host',
            'graylog.facility': 'test',
            'graylog.endpoint': 'http://localhost:12201/gelf',
            'graylog.timeout': 3000,
          };
          return values[key];
        },
      })
      .compile();

    const graylogService = moduleRef.get(GraylogService);
    const loggerService = moduleRef.get(GraylogLoggerService);

    expect(graylogService).toBeInstanceOf(GraylogService);
    expect(loggerService).toBeInstanceOf(GraylogLoggerService);

    await moduleRef.close();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});