import { AbstractWebsocketService } from './abstract-websocket.service';
import {
  MessageHandler,
  MessagePayload,
} from './interfaces/message-handler.interface';
import { AuthenticatedSocket } from './abstract-websocket.gateway';
import { Role } from '@modules/auth/enums/role.enum';

class TestWebsocketService extends AbstractWebsocketService {}

function createSocket(
  id: string,
  overrides: Partial<AuthenticatedSocket> = {},
): AuthenticatedSocket {
  return {
    id,
    emit: jest.fn(),
    data: {},
    ...overrides,
  } as unknown as AuthenticatedSocket;
}

function createHandler(
  type: string,
  options: Partial<MessageHandler> = {},
): MessageHandler {
  return {
    canHandle: jest.fn((t: string) => t === type),
    handle: jest.fn(),
    ...options,
  };
}

describe('AbstractWebsocketService', () => {
  let service: TestWebsocketService;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new TestWebsocketService();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe('registerMessageHandler', () => {
    it('adds the handler and logs its constructor name', () => {
      class ExampleHandler implements MessageHandler {
        canHandle(): boolean {
          return true;
        }
        handle(): void {}
      }
      const handler = new ExampleHandler();

      service.registerMessageHandler(handler);

      expect(service['messageHandlers']).toContain(handler);
      expect(logSpy).toHaveBeenCalledWith(
        'Registered message handler for type: ExampleHandler',
      );
    });
  });

  describe('client registry', () => {
    it('addClient / getClient / removeClient manage the map', () => {
      const client = createSocket('c1');

      service.addClient(client);
      expect(service.getClient('c1')).toBe(client);

      service.removeClient('c1');
      expect(service.getClient('c1')).toBeUndefined();
    });

    it('getAllClients returns the live clients map', () => {
      const a = createSocket('a');
      const b = createSocket('b');
      service.addClient(a);
      service.addClient(b);

      const all = service.getAllClients();
      expect(all.size).toBe(2);
      expect(all.get('a')).toBe(a);
      expect(all.get('b')).toBe(b);
    });
  });

  describe('sendToClient', () => {
    it('emits and returns true when the client exists', () => {
      const client = createSocket('c1');
      service.addClient(client);

      const ok = service.sendToClient('c1', 'ping', { n: 1 });

      expect(ok).toBe(true);
      expect(client.emit).toHaveBeenCalledWith('ping', { n: 1 });
    });

    it('returns false when the client is missing', () => {
      expect(service.sendToClient('missing', 'ping', {})).toBe(false);
    });
  });

  describe('broadcast', () => {
    it('emits to every connected client', () => {
      const a = createSocket('a');
      const b = createSocket('b');
      service.addClient(a);
      service.addClient(b);

      service.broadcast('news', { text: 'hi' });

      expect(a.emit).toHaveBeenCalledWith('news', { text: 'hi' });
      expect(b.emit).toHaveBeenCalledWith('news', { text: 'hi' });
    });

    it('skips the except client id when provided', () => {
      const a = createSocket('a');
      const b = createSocket('b');
      service.addClient(a);
      service.addClient(b);

      service.broadcast('news', { text: 'hi' }, 'a');

      expect(a.emit).not.toHaveBeenCalled();
      expect(b.emit).toHaveBeenCalledWith('news', { text: 'hi' });
    });
  });

  describe('processMessage', () => {
    it('warns and returns when no handler matches', () => {
      const client = createSocket('c1');
      const payload: MessagePayload = { type: 'unknown' };

      service.processMessage(client, payload);

      expect(warnSpy).toHaveBeenCalledWith(
        'No handler found for message type: unknown',
      );
    });

    it('delegates to the matching handler when roles are not required', () => {
      const handler = createHandler('chat');
      service.registerMessageHandler(handler);
      const client = createSocket('c1');
      const payload: MessagePayload = { type: 'chat', text: 'hello' };

      service.processMessage(client, payload);

      expect(handler.handle).toHaveBeenCalledWith(client, payload);
    });

    it('uses the first matching handler when multiple are registered', () => {
      const first = createHandler('chat');
      const second = createHandler('chat');
      service.registerMessageHandler(first);
      service.registerMessageHandler(second);

      const client = createSocket('c1');
      service.processMessage(client, { type: 'chat' });

      expect(first.handle).toHaveBeenCalled();
      expect(second.handle).not.toHaveBeenCalled();
    });

    it('allows the message when the user has one of the required roles via data.user', () => {
      const handler = createHandler('admin-only', { roles: [Role.ADMIN] });
      service.registerMessageHandler(handler);
      const client = createSocket('c1', {
        data: { user: { id: 'u1', roles: [Role.ADMIN, Role.USER] } },
      });

      service.processMessage(client, { type: 'admin-only' });

      expect(handler.handle).toHaveBeenCalled();
      expect(client.emit).not.toHaveBeenCalledWith(
        'error',
        expect.anything(),
      );
    });

    it('allows the message when roles come from socket.user', () => {
      const handler = createHandler('admin-only', { roles: [Role.ADMIN] });
      service.registerMessageHandler(handler);
      const client = createSocket('c1', {
        user: { id: 'u1', roles: [Role.ADMIN] },
        data: {},
      });

      service.processMessage(client, { type: 'admin-only' });

      expect(handler.handle).toHaveBeenCalled();
    });

    it('emits 403 and skips handle when roles are insufficient', () => {
      const handler = createHandler('admin-only', {
        roles: [Role.ADMIN, Role.SUPER],
      });
      service.registerMessageHandler(handler);
      const client = createSocket('c1', {
        data: { user: { id: 'u1', roles: [Role.USER] } },
      });

      service.processMessage(client, { type: 'admin-only' });

      expect(handler.handle).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith('error', {
        statusCode: 403,
        message: 'Forbidden - insufficient role for this message type',
        requiredRoles: [Role.ADMIN, Role.SUPER],
      });
    });

    it('treats missing user roles as empty and rejects when roles are required', () => {
      const handler = createHandler('admin-only', { roles: [Role.ADMIN] });
      service.registerMessageHandler(handler);
      const client = createSocket('c1', { data: {} });

      service.processMessage(client, { type: 'admin-only' });

      expect(handler.handle).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ statusCode: 403 }),
      );
    });

    it('does not enforce roles when handler.roles is an empty array', () => {
      const handler = createHandler('open', { roles: [] });
      service.registerMessageHandler(handler);
      const client = createSocket('c1', { data: {} });

      service.processMessage(client, { type: 'open' });

      expect(handler.handle).toHaveBeenCalled();
    });
  });
});
