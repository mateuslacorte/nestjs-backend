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

    it('addClient tracks socket by userId and creates a new Set on first connection', () => {
      const client = createSocket('s1', { userId: 'u1' });
      service.addClient(client);

      expect(service['userSockets'].get('u1')).toContain('s1');
    });

    it('addClient adds to an existing Set when the same user reconnects', () => {
      const c1 = createSocket('s1', { userId: 'u1' });
      const c2 = createSocket('s2', { userId: 'u1' });
      service.addClient(c1);
      service.addClient(c2);

      expect(service['userSockets'].get('u1')?.size).toBe(2);
    });

    it('removeClient cleans up the userId entry when the last socket disconnects', () => {
      const client = createSocket('s1', { userId: 'u1' });
      service.addClient(client);

      service.removeClient('s1');

      expect(service['userSockets'].has('u1')).toBe(false);
    });

    it('removeClient keeps userId entry when other sockets remain', () => {
      const c1 = createSocket('s1', { userId: 'u1' });
      const c2 = createSocket('s2', { userId: 'u1' });
      service.addClient(c1);
      service.addClient(c2);

      service.removeClient('s1');

      expect(service['userSockets'].get('u1')?.has('s2')).toBe(true);
    });

    it('removeClient is a no-op when clientId is not registered', () => {
      expect(() => service.removeClient('nonexistent')).not.toThrow();
    });
  });

  describe('sendToUser', () => {
    it('sends event to all sockets of a user and returns the count', () => {
      const c1 = createSocket('s1', { userId: 'u1' });
      const c2 = createSocket('s2', { userId: 'u1' });
      service.addClient(c1);
      service.addClient(c2);

      const sent = service.sendToUser('u1', 'ping', { n: 1 });

      expect(sent).toBe(2);
      expect(c1.emit).toHaveBeenCalledWith('ping', { n: 1 });
      expect(c2.emit).toHaveBeenCalledWith('ping', { n: 1 });
    });

    it('returns 0 when the user has no connected sockets', () => {
      const sent = service.sendToUser('ghost', 'ping', {});
      expect(sent).toBe(0);
    });

    it('skips disconnected sockets and counts only successful sends', () => {
      const c1 = createSocket('s1', { userId: 'u1' });
      service.addClient(c1);
      // Simulate a stale socketId tracked in userSockets but not in clients
      service['userSockets'].get('u1')!.add('stale-id');

      const sent = service.sendToUser('u1', 'ping', { n: 1 });

      expect(sent).toBe(1);
      expect(c1.emit).toHaveBeenCalledWith('ping', { n: 1 });
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

      // console.warn is intercepted by Graylog; just verify no emit
      expect(client.emit).not.toHaveBeenCalled();
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
        message: 'Forbidden - insufficient role',
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
