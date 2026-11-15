import { WebsocketService } from './websocket.service';
import { AbstractWebsocketService } from './abstract-websocket.service';
import { RedisPubSubService } from '@common/pubsub/redis-pubsub.service';
import { Server } from 'socket.io';

function mockPubSub(): RedisPubSubService {
  return { subscribe: jest.fn().mockResolvedValue(undefined), publish: jest.fn() } as unknown as RedisPubSubService;
}

function makeServer(): { server: Server; close: jest.Mock } {
  const close = jest.fn((cb?: () => void) => { cb?.(); });
  return { server: { close } as unknown as Server, close };
}

describe('WebsocketService', () => {
  it('extends AbstractWebsocketService', () => {
    const service = new WebsocketService(mockPubSub());
    expect(service).toBeInstanceOf(AbstractWebsocketService);
    expect(service).toBeInstanceOf(WebsocketService);
  });

  it('inherits client registry behavior from the abstract base', () => {
    const service = new WebsocketService(mockPubSub());
    const client = {
      id: 'sock-1',
      emit: jest.fn(),
    } as never;

    service.addClient(client);
    expect(service.getClient('sock-1')).toBe(client);
    expect(service.sendToClient('sock-1', 'evt', { ok: true })).toBe(true);
  });

  describe('onApplicationShutdown', () => {
    it('broadcasts server:shutdown to all connected clients', async () => {
      const service = new WebsocketService(mockPubSub());
      const emit = jest.fn();
      service.addClient({ id: 'c1', emit } as never);

      await service.onApplicationShutdown();

      expect(emit).toHaveBeenCalledWith('server:shutdown', {});
    });

    it('calls server.close() when server is set', async () => {
      const service = new WebsocketService(mockPubSub());
      const { server, close } = makeServer();
      service.setServer(server);

      await service.onApplicationShutdown();

      expect(close).toHaveBeenCalledTimes(1);
    });

    it('does not throw when no server is set', async () => {
      const service = new WebsocketService(mockPubSub());
      await expect(service.onApplicationShutdown()).resolves.toBeUndefined();
    });
  });
});
