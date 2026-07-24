import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { WebsocketModule } from './websocket.module';
import { WebsocketService } from './websocket.service';
import { WebsocketGateway } from './websocket.gateway';
import {
  MessageHandler,
  MessagePayload,
} from './interfaces/message-handler.interface';
import { Socket } from 'socket.io';
import { Role } from '@modules/auth/enums/role.enum';

class AlphaHandler implements MessageHandler {
  canHandle(type: string): boolean {
    return type === 'alpha';
  }

  handle(_client: Socket, _payload: MessagePayload): void {}
}

class BetaHandler implements MessageHandler {
  readonly roles = [Role.ADMIN];

  canHandle(type: string): boolean {
    return type === 'beta';
  }

  handle(_client: Socket, _payload: MessagePayload): void {}
}

describe('WebsocketModule', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('static module metadata', () => {
    it('forRoot returns a dynamic module with gateway and service', () => {
      const dynamic = WebsocketModule.forRoot();

      expect(dynamic.module).toBe(WebsocketModule);
      expect(dynamic.providers).toEqual(
        expect.arrayContaining([WebsocketGateway, WebsocketService]),
      );
      expect(dynamic.exports).toEqual([WebsocketService]);
    });

    it('forFeature with no handlers still wires MESSAGE_HANDLERS factory', () => {
      const dynamic = WebsocketModule.forFeature();

      expect(dynamic.module).toBe(WebsocketModule);
      expect(dynamic.exports).toEqual([]);
      expect(dynamic.providers).toHaveLength(1);

      const handlersProvider = dynamic.providers![0] as {
        provide: string;
        useFactory: (...args: unknown[]) => unknown;
        inject: unknown[];
      };
      expect(handlersProvider.provide).toBe('MESSAGE_HANDLERS');
      expect(handlersProvider.inject).toEqual([WebsocketService]);
    });

    it('forFeature registers provider tokens per handler constructor name', () => {
      const alpha = new AlphaHandler();
      const beta = new BetaHandler();
      const dynamic = WebsocketModule.forFeature([alpha, beta]);

      const providers = dynamic.providers as Array<{
        provide?: string;
        useValue?: unknown;
        inject?: unknown[];
      }>;

      expect(providers).toEqual(
        expect.arrayContaining([
          {
            provide: 'MESSAGE_HANDLER_AlphaHandler',
            useValue: alpha,
          },
          {
            provide: 'MESSAGE_HANDLER_BetaHandler',
            useValue: beta,
          },
        ]),
      );

      const factoryProvider = providers.find(
        (p) => p.provide === 'MESSAGE_HANDLERS',
      );
      expect(factoryProvider?.inject).toEqual([
        WebsocketService,
        'MESSAGE_HANDLER_AlphaHandler',
        'MESSAGE_HANDLER_BetaHandler',
      ]);
    });
  });

  describe('Nest DI integration', () => {
    it('provides and exports WebsocketService from the root module', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [WebsocketModule],
      })
        .overrideProvider(WebsocketGateway)
        .useValue({
          handleMessage: jest.fn(),
        })
        .overrideProvider(ConfigService)
        .useValue({ get: jest.fn() })
        .compile();

      const service = moduleRef.get(WebsocketService);
      expect(service).toBeInstanceOf(WebsocketService);

      await moduleRef.close();
    });

    it('forRoot compiles and resolves WebsocketService', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [WebsocketModule.forRoot()],
      })
        .overrideProvider(WebsocketGateway)
        .useValue({})
        .compile();

      expect(moduleRef.get(WebsocketService)).toBeInstanceOf(WebsocketService);
      await moduleRef.close();
    });

    it('forFeature factory registers handlers on WebsocketService', async () => {
      const alpha = new AlphaHandler();
      const beta = new BetaHandler();
      const registerSpy = jest.spyOn(
        WebsocketService.prototype,
        'registerMessageHandler',
      );

      const moduleRef = await Test.createTestingModule({
        imports: [
          WebsocketModule.forRoot(),
          WebsocketModule.forFeature([alpha, beta]),
        ],
      })
        .overrideProvider(WebsocketGateway)
        .useValue({})
        .compile();

      // Force factory resolution
      const handlers = moduleRef.get<MessageHandler[]>('MESSAGE_HANDLERS');
      expect(handlers).toEqual([alpha, beta]);
      expect(registerSpy).toHaveBeenCalledWith(alpha);
      expect(registerSpy).toHaveBeenCalledWith(beta);

      const service = moduleRef.get(WebsocketService);
      expect(service['messageHandlers']).toEqual(
        expect.arrayContaining([alpha, beta]),
      );

      registerSpy.mockRestore();
      await moduleRef.close();
    });

    it('forFeature with empty handlers resolves to an empty list', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [WebsocketModule.forRoot(), WebsocketModule.forFeature([])],
      })
        .overrideProvider(WebsocketGateway)
        .useValue({})
        .compile();

      await expect(
        moduleRef.resolve('MESSAGE_HANDLERS'),
      ).resolves.toEqual([]);

      await moduleRef.close();
    });
  });
});
