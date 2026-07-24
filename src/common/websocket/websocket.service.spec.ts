import { WebsocketService } from './websocket.service';
import { AbstractWebsocketService } from './abstract-websocket.service';

describe('WebsocketService', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('extends AbstractWebsocketService', () => {
    const service = new WebsocketService();
    expect(service).toBeInstanceOf(AbstractWebsocketService);
    expect(service).toBeInstanceOf(WebsocketService);
  });

  it('logs initialization on construct', () => {
    new WebsocketService();
    expect(logSpy).toHaveBeenCalledWith('WebSocket service initialized');
  });

  it('inherits client registry behavior from the abstract base', () => {
    const service = new WebsocketService();
    const client = {
      id: 'sock-1',
      emit: jest.fn(),
    } as never;

    service.addClient(client);
    expect(service.getClient('sock-1')).toBe(client);
    expect(service.sendToClient('sock-1', 'evt', { ok: true })).toBe(true);
  });
});
