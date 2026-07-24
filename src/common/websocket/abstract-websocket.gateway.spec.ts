import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import {
  AbstractWebsocketGateway,
  AuthenticatedSocket,
} from './abstract-websocket.gateway';
import { AbstractWebsocketService } from './abstract-websocket.service';
import { Role } from '@modules/auth/enums/role.enum';

jest.mock('@config/cors-origins.util', () => ({
  isOriginAllowed: jest.fn(),
}));

import { isOriginAllowed } from '@config/cors-origins.util';

const mockIsOriginAllowed = isOriginAllowed as jest.MockedFunction<
  typeof isOriginAllowed
>;

class TestGateway extends AbstractWebsocketGateway {
  afterConnectionCalls: Socket[] = [];
  afterDisconnectionCalls: Socket[] = [];

  protected afterConnection(client: Socket): void {
    this.afterConnectionCalls.push(client);
  }

  protected afterDisconnection(client: Socket): void {
    this.afterDisconnectionCalls.push(client);
  }
}

type CapturedMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
) => void;

function createConfigService(
  values: Record<string, unknown> = {},
): ConfigService {
  const defaults: Record<string, unknown> = {
    'cors.origins': ['https://app.example.com'],
    'jwt.secret': 'test-secret',
    ...values,
  };
  return {
    get: jest.fn((key: string) => defaults[key]),
  } as unknown as ConfigService;
}

function createService(): jest.Mocked<
  Pick<
    AbstractWebsocketService,
    'addClient' | 'removeClient' | 'processMessage'
  >
> {
  return {
    addClient: jest.fn(),
    removeClient: jest.fn(),
    processMessage: jest.fn(),
  };
}

function createServer(): {
  server: Server;
  getMiddleware: () => CapturedMiddleware;
} {
  let middleware!: CapturedMiddleware;
  const server = {
    use: jest.fn((fn: CapturedMiddleware) => {
      middleware = fn;
    }),
  } as unknown as Server;
  return {
    server,
    getMiddleware: () => middleware,
  };
}

function createHandshakeSocket(
  overrides: {
    id?: string;
    origin?: string | string[] | undefined;
    authorization?: string | string[] | undefined;
    authToken?: string;
    data?: Record<string, unknown>;
  } = {},
): AuthenticatedSocket {
  const headers: Record<string, unknown> = {};
  if ('origin' in overrides) {
    headers.origin = overrides.origin;
  } else {
    headers.origin = 'https://app.example.com';
  }
  if ('authorization' in overrides) {
    headers.authorization = overrides.authorization;
  }

  return {
    id: overrides.id ?? 'sock-1',
    handshake: {
      headers,
      auth: overrides.authToken
        ? { token: overrides.authToken }
        : {},
    },
    data: overrides.data ?? {},
    disconnect: jest.fn(),
  } as unknown as AuthenticatedSocket;
}

describe('AbstractWebsocketGateway', () => {
  let websocketService: ReturnType<typeof createService>;
  let configService: ConfigService;
  let gateway: TestGateway;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOriginAllowed.mockReturnValue(true);
    websocketService = createService();
    configService = createConfigService();
    gateway = new TestGateway(
      websocketService as unknown as AbstractWebsocketService,
      configService,
    );

    logSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
    warnSpy = jest.spyOn(gateway['logger'], 'warn').mockImplementation();
    errorSpy = jest.spyOn(gateway['logger'], 'error').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('afterInit middleware', () => {
    function installMiddleware(): CapturedMiddleware {
      const { server, getMiddleware } = createServer();
      gateway.afterInit(server);
      expect(server.use).toHaveBeenCalledTimes(1);
      return getMiddleware();
    }

    it('registers a socket.io middleware on the server', () => {
      const { server } = createServer();
      gateway.afterInit(server);
      expect(server.use).toHaveBeenCalledWith(expect.any(Function));
    });

    it('rejects when origin is not allowed', () => {
      mockIsOriginAllowed.mockReturnValue(false);
      const middleware = installMiddleware();
      const socket = createHandshakeSocket({ origin: 'https://evil.com' });
      const next = jest.fn();

      middleware(socket, next);

      expect(mockIsOriginAllowed).toHaveBeenCalledWith('https://evil.com', [
        'https://app.example.com',
      ]);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Origin not allowed by CORS' }),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Origin not allowed'),
      );
    });

    it('treats non-string origin header as undefined', () => {
      mockIsOriginAllowed.mockReturnValue(false);
      const middleware = installMiddleware();
      const socket = createHandshakeSocket({ origin: ['https://a.com'] });
      const next = jest.fn();

      middleware(socket, next);

      expect(mockIsOriginAllowed).toHaveBeenCalledWith(undefined, [
        'https://app.example.com',
      ]);
    });

    it('uses empty allowed origins when cors.origins is unset', () => {
      configService = createConfigService({ 'cors.origins': undefined });
      gateway = new TestGateway(
        websocketService as unknown as AbstractWebsocketService,
        configService,
      );
      logSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      warnSpy = jest.spyOn(gateway['logger'], 'warn').mockImplementation();
      errorSpy = jest.spyOn(gateway['logger'], 'error').mockImplementation();

      mockIsOriginAllowed.mockReturnValue(true);
      const { server } = createServer();
      gateway.afterInit(server);
      const middleware = (server.use as jest.Mock).mock.calls[0][0] as CapturedMiddleware;
      const token = jwt.sign({ id: 'u1', roles: [Role.USER] }, 'fallback-secret-key');
      const socket = createHandshakeSocket({ authToken: token });
      const next = jest.fn();

      middleware(socket, next);

      expect(mockIsOriginAllowed).toHaveBeenCalledWith(
        'https://app.example.com',
        [],
      );
    });

    it('rejects when no token is provided', () => {
      const middleware = installMiddleware();
      const socket = createHandshakeSocket();
      const next = jest.fn();

      middleware(socket, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication token required',
        }),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No token provided'),
      );
    });

    it('accepts token from handshake.auth.token', () => {
      const middleware = installMiddleware();
      const token = jwt.sign(
        { id: 'user-1', email: 'a@b.com', roles: [Role.ADMIN] },
        'test-secret',
      );
      const socket = createHandshakeSocket({ authToken: token });
      const next = jest.fn();

      middleware(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe('user-1');
      expect(socket.user).toEqual({
        id: 'user-1',
        email: 'a@b.com',
        roles: [Role.ADMIN],
      });
      expect(socket.data.user).toEqual(socket.user);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Client authenticated'),
      );
    });

    it('accepts Bearer token from authorization header', () => {
      const middleware = installMiddleware();
      const token = jwt.sign({ id: 'user-2', roles: [Role.USER] }, 'test-secret');
      const socket = createHandshakeSocket({
        authorization: `Bearer ${token}`,
      });
      const next = jest.fn();

      middleware(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe('user-2');
    });

    it('strips Bearer prefix case-insensitively', () => {
      const middleware = installMiddleware();
      const token = jwt.sign({ id: 'user-3' }, 'test-secret');
      const socket = createHandshakeSocket({
        authorization: `bearer ${token}`,
      });
      const next = jest.fn();

      middleware(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe('user-3');
    });

    it('defaults roles to [] when claim is not an array', () => {
      const middleware = installMiddleware();
      const token = jwt.sign({ id: 'user-4', roles: 'admin' }, 'test-secret');
      const socket = createHandshakeSocket({ authToken: token });
      const next = jest.fn();

      middleware(socket, next);

      expect(socket.user?.roles).toEqual([]);
    });

    it('rejects when decoded token has no id', () => {
      const middleware = installMiddleware();
      const token = jwt.sign({ email: 'x@y.com' }, 'test-secret');
      const socket = createHandshakeSocket({ authToken: token });
      const next = jest.fn();

      middleware(socket, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid token' }),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid token'),
      );
    });

    it('uses fallback jwt secret when jwt.secret is unset', () => {
      configService = createConfigService({ 'jwt.secret': undefined });
      gateway = new TestGateway(
        websocketService as unknown as AbstractWebsocketService,
        configService,
      );
      logSpy = jest.spyOn(gateway['logger'], 'log').mockImplementation();
      warnSpy = jest.spyOn(gateway['logger'], 'warn').mockImplementation();
      errorSpy = jest.spyOn(gateway['logger'], 'error').mockImplementation();

      const { server } = createServer();
      gateway.afterInit(server);
      const middleware = (server.use as jest.Mock).mock
        .calls[0][0] as CapturedMiddleware;
      const token = jwt.sign({ id: 'fallback-user' }, 'fallback-secret-key');
      const socket = createHandshakeSocket({ authToken: token });
      const next = jest.fn();

      middleware(socket, next);

      expect(next).toHaveBeenCalledWith();
      expect(socket.userId).toBe('fallback-user');
    });

    it('rejects with Authentication failed when jwt.verify throws', () => {
      const middleware = installMiddleware();
      const socket = createHandshakeSocket({ authToken: 'not-a-jwt' });
      const next = jest.fn();

      middleware(socket, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Authentication failed' }),
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Authentication error'),
      );
    });

    it('ignores non-string authorization header values', () => {
      const middleware = installMiddleware();
      const socket = createHandshakeSocket({
        authorization: ['Bearer abc'] as unknown as string,
      });
      const next = jest.fn();

      middleware(socket, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authentication token required',
        }),
      );
    });
  });

  describe('handleConnection', () => {
    it('disconnects when userId is missing', () => {
      const client = {
        id: 'c1',
        data: {},
        disconnect: jest.fn(),
      } as unknown as AuthenticatedSocket;

      gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(websocketService.addClient).not.toHaveBeenCalled();
      expect(gateway.afterConnectionCalls).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No userId'),
      );
    });

    it('adds the client and calls afterConnection when userId is set', () => {
      const client = {
        id: 'c1',
        userId: 'u1',
        data: {},
        disconnect: jest.fn(),
      } as unknown as AuthenticatedSocket;

      gateway.handleConnection(client);

      expect(websocketService.addClient).toHaveBeenCalledWith(client);
      expect(gateway.afterConnectionCalls).toEqual([client]);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Client connected'),
      );
    });

    it('falls back to data.user.id when userId is unset', () => {
      const client = {
        id: 'c2',
        data: { user: { id: 'u2', roles: [] } },
        disconnect: jest.fn(),
      } as unknown as AuthenticatedSocket;

      gateway.handleConnection(client);

      expect(websocketService.addClient).toHaveBeenCalledWith(client);
      expect(gateway.afterConnectionCalls).toEqual([client]);
    });
  });

  describe('handleDisconnect', () => {
    it('removes the client and calls afterDisconnection', () => {
      const client = {
        id: 'c1',
        userId: 'u1',
        data: {},
      } as unknown as AuthenticatedSocket;

      gateway.handleDisconnect(client);

      expect(websocketService.removeClient).toHaveBeenCalledWith('c1');
      expect(gateway.afterDisconnectionCalls).toEqual([client]);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Client disconnected'),
      );
    });

    it('logs unknown when no user id is available', () => {
      const client = {
        id: 'c1',
        data: {},
      } as unknown as AuthenticatedSocket;

      gateway.handleDisconnect(client);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('userId: unknown'),
      );
    });
  });

  describe('default hooks', () => {
    it('base afterConnection / afterDisconnection are no-ops', () => {
      class BareGateway extends AbstractWebsocketGateway {}
      const bare = new BareGateway(
        websocketService as unknown as AbstractWebsocketService,
        configService,
      );
      jest.spyOn(bare['logger'], 'log').mockImplementation();
      jest.spyOn(bare['logger'], 'warn').mockImplementation();

      const client = {
        id: 'c1',
        userId: 'u1',
        data: {},
        disconnect: jest.fn(),
      } as unknown as AuthenticatedSocket;

      expect(() => bare.handleConnection(client)).not.toThrow();
      expect(() => bare.handleDisconnect(client)).not.toThrow();
    });
  });
});
