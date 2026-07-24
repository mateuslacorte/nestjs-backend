import { ConfigService } from '@nestjs/config';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { AbstractWebsocketGateway } from './abstract-websocket.gateway';
import { Socket } from 'socket.io';

describe('WebsocketGateway', () => {
  let websocketService: {
    processMessage: jest.Mock;
    addClient: jest.Mock;
    removeClient: jest.Mock;
  };
  let configService: ConfigService;
  let gateway: WebsocketGateway;

  beforeEach(() => {
    websocketService = {
      processMessage: jest.fn(),
      addClient: jest.fn(),
      removeClient: jest.fn(),
    };
    configService = {
      get: jest.fn(),
    } as unknown as ConfigService;

    gateway = new WebsocketGateway(
      websocketService as unknown as WebsocketService,
      configService,
    );
  });

  it('extends AbstractWebsocketGateway', () => {
    expect(gateway).toBeInstanceOf(AbstractWebsocketGateway);
  });

  describe('handleMessage', () => {
    it('forwards the payload to WebsocketService.processMessage', () => {
      const client = { id: 'c1' } as Socket;
      const payload = { type: 'chat', text: 'hello' };

      gateway.handleMessage(client, payload);

      expect(websocketService.processMessage).toHaveBeenCalledWith(
        client,
        payload,
      );
    });

    it('returns a messageResponse acknowledgement', () => {
      const client = { id: 'c1' } as Socket;
      const result = gateway.handleMessage(client, { type: 'ping' });

      expect(result).toEqual({
        event: 'messageResponse',
        data: { received: true },
      });
    });

    it('acknowledges after processMessage completes', () => {
      const client = { id: 'c1' } as Socket;
      websocketService.processMessage.mockImplementation(() => undefined);

      expect(gateway.handleMessage(client, { type: 'x' })).toEqual({
        event: 'messageResponse',
        data: { received: true },
      });
      expect(websocketService.processMessage).toHaveBeenCalledTimes(1);
    });
  });
});
