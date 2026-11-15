import { WebsocketService } from './websocket.service';
import { AbstractWebsocketService } from './abstract-websocket.service';
import { RedisPubSubService } from '@common/pubsub/redis-pubsub.service';

function mockPubSub(): RedisPubSubService {
  return { subscribe: jest.fn().mockResolvedValue(undefined), publish: jest.fn() } as unknown as RedisPubSubService;
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
});
