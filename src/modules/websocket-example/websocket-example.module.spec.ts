import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { WebsocketModule } from '@common/websocket/websocket.module';
import { WebsocketService } from '@common/websocket/websocket.service';
import { WebsocketExampleModule } from './websocket-example.module';
import { WebsocketExampleService } from './websocket-example.service';
import { WebsocketExampleHandler } from './handlers/websocket-example.handler';
import { WebsocketExampleController } from './websocket-example.controller';

@Module({
  providers: [
    {
      provide: WebsocketService,
      useValue: {
        registerMessageHandler: jest.fn(),
      },
    },
  ],
  exports: [WebsocketService],
})
class StubWebsocketModule {}

describe('WebsocketExampleModule', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('declares imports, controller, providers, and exports', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, WebsocketExampleModule),
    ).toEqual([WebsocketModule]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, WebsocketExampleModule),
    ).toEqual([WebsocketExampleController]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, WebsocketExampleModule),
    ).toEqual([WebsocketExampleService]);

    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      WebsocketExampleModule,
    ) as Array<unknown | { provide: string }>;

    expect(providers).toEqual(
      expect.arrayContaining([
        WebsocketExampleService,
        WebsocketExampleHandler,
        expect.objectContaining({ provide: 'REGISTER_HANDLERS' }),
      ]),
    );
  });

  it('registers the example handler on WebsocketService via module factory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [WebsocketExampleModule],
    })
      .overrideModule(WebsocketModule)
      .useModule(StubWebsocketModule)
      .compile();

    expect(moduleRef.get('REGISTER_HANDLERS')).toBe(true);

    const websocketService = moduleRef.get(WebsocketService);
    const handler = moduleRef.get(WebsocketExampleHandler);
    expect(websocketService.registerMessageHandler).toHaveBeenCalledWith(
      handler,
    );
    expect(moduleRef.get(WebsocketExampleService)).toBeInstanceOf(
      WebsocketExampleService,
    );
    expect(moduleRef.get(WebsocketExampleController)).toBeInstanceOf(
      WebsocketExampleController,
    );

    await moduleRef.close();
  });
});
